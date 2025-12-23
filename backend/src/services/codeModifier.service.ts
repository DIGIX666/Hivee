import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { CodeModification } from '../types';
import config from '../config';

export class CodeModifierService {
  /**
   * Modify agent code: replace payment addresses with escrow address
   */
  async modifyAgentCode(
    originalPath: string,
    language: string,
    escrowAddress: string,
    agentIdentityId?: number,
    brokerApiUrl: string = 'http://broker-agent:8001'
  ): Promise<CodeModification> {
    logger.info(`Modifying agent code at ${originalPath}`);

    const modifiedPath = originalPath.replace('/original/', '/modified/');
    await fs.mkdir(path.dirname(modifiedPath), { recursive: true });

    let addressesReplaced = 0;
    let originalPaymentAddress: string | null = null;

    if (language === 'python') {
      const result = await this.modifyPythonCode(
        originalPath,
        modifiedPath,
        escrowAddress,
        agentIdentityId,
        brokerApiUrl
      );
      addressesReplaced = result.totalReplacements;
      originalPaymentAddress = result.firstAddress;
    } else if (language === 'javascript' || language === 'typescript') {
      const result = await this.modifyJavaScriptCode(originalPath, modifiedPath, escrowAddress);
      addressesReplaced = result.totalReplacements;
      originalPaymentAddress = result.firstAddress;
    }

    const hooksInjected = ['hivee_sdk', 'payment_address_replacement'];

    return {
      originalPath,
      modifiedPath,
      addressesReplaced,
      hooksInjected,
      originalPaymentAddress,
    };
  }

  /**
   * Modify Python code
   */
  private async modifyPythonCode(
    originalPath: string,
    modifiedPath: string,
    escrowAddress: string,
    agentIdentityId?: number,
    brokerApiUrl?: string
  ): Promise<{ totalReplacements: number; firstAddress: string | null }> {
    const files = await this.getAllFiles(originalPath, ['.py']);
    let totalReplacements = 0;
    let firstAddressFound: string | null = null;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');

      // Extract first address BEFORE replacement
      if (!firstAddressFound) {
        firstAddressFound = this.extractFirstAddress(content);
      }

      // Then replace addresses
      const { modifiedContent, replacements } = this.replaceAddressesInPython(content, escrowAddress);

      const relativePath = path.relative(originalPath, file);
      const outputPath = path.join(modifiedPath, relativePath);

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, modifiedContent, 'utf-8');

      totalReplacements += replacements;
    }

    // Copy Hivee SDK instead of injecting simplified code
    await this.copyHiveeSDK(modifiedPath);

    // Create .env file with configuration
    await this.createEnvFile(modifiedPath, escrowAddress, agentIdentityId, brokerApiUrl);

    // Update agent code to import and initialize SDK
    await this.updatePythonAgentToUseSDK(modifiedPath);

    return { totalReplacements, firstAddress: firstAddressFound };
  }

  /**
   * Replace Ethereum/wallet addresses in Python code
   */
  private replaceAddressesInPython(
    content: string,
    escrowAddress: string
  ): { modifiedContent: string; replacements: number } {
    let modifiedContent = content;
    let replacements = 0;

    // Ethereum address pattern (0x followed by 40 hex characters)
    const ethAddressPattern = /(['"`])0x[a-fA-F0-9]{40}\1/g;

    modifiedContent = modifiedContent.replace(ethAddressPattern, (match) => {
      replacements++;
      return match.replace(/0x[a-fA-F0-9]{40}/, escrowAddress);
    });

    // Replace in config/environment variable patterns
    const configPatterns = [
      /WALLET_ADDRESS\s*=\s*['"`]0x[a-fA-F0-9]{40}['"`]/g,
      /PAYMENT_ADDRESS\s*=\s*['"`]0x[a-fA-F0-9]{40}['"`]/g,
      /RECIPIENT_ADDRESS\s*=\s*['"`]0x[a-fA-F0-9]{40}['"`]/g,
    ];

    configPatterns.forEach(pattern => {
      modifiedContent = modifiedContent.replace(pattern, (match) => {
        replacements++;
        return match.replace(/0x[a-fA-F0-9]{40}/, escrowAddress);
      });
    });

    return { modifiedContent, replacements };
  }

  /**
   * Extract first Ethereum address from content
   */
  private extractFirstAddress(content: string): string | null {
    const ethAddressPattern = /(['"`])0x[a-fA-F0-9]{40}\1/g;
    const match = ethAddressPattern.exec(content);

    if (match) {
      // Remove surrounding quotes
      return match[0].slice(1, -1);
    }

    return null;
  }

  /**
   * Copy Hivee SDK to modified agent code
   */
  private async copyHiveeSDK(modifiedPath: string): Promise<void> {
    logger.info('Copying Hivee SDK to agent');

    // Create shared directory
    const sharedDir = path.join(modifiedPath, 'shared');
    await fs.mkdir(sharedDir, { recursive: true });

    // Get SDK source path from configuration
    const sdkSourcePath = config.sdk.sourcePath;

    // Verify SDK source path exists
    try {
      await fs.access(sdkSourcePath);
      logger.debug(`SDK source path verified: ${sdkSourcePath}`);
    } catch (error) {
      const errorMsg = `Hivee SDK source path not found: ${sdkSourcePath}. ` +
        `Please set HIVEE_SDK_PATH environment variable or ensure the default path exists.`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Copy SDK files
    const sdkFiles = ['__init__.py', 'hivee_sdk.py', 'README.md'];

    for (const file of sdkFiles) {
      const sourcePath = path.join(sdkSourcePath, file);
      const destPath = path.join(sharedDir, file);

      try {
        await fs.copyFile(sourcePath, destPath);
        logger.debug(`Copied ${file} to agent`);
      } catch (error) {
        logger.error(`Failed to copy ${file}:`, error);
        throw new Error(`Failed to copy Hivee SDK file "${file}". Ensure it exists at ${sourcePath}`);
      }
    }

    logger.info(`Hivee SDK copied successfully from ${sdkSourcePath}`);
  }

  /**
   * Create .env file for agent with platform configuration
   */
  private async createEnvFile(
    modifiedPath: string,
    escrowAddress: string,
    agentIdentityId?: number,
    brokerApiUrl?: string
  ): Promise<void> {
    const envContent = `# Hivee Platform Configuration (Auto-generated)
CAPX_RPC_URL=https://global.rpc-zkevm.capx.fi
ESCROW_ADDRESS=${escrowAddress}
IDENTITY_TOKEN_ID=${agentIdentityId || ''}
BROKER_API_URL=${brokerApiUrl || 'http://broker-agent:8001'}

# Note: PRIVATE_KEY will be injected at runtime by the platform
# Note: GROQ_API_KEY will be injected at runtime by the platform
`;

    const envPath = path.join(modifiedPath, '.env');
    await fs.writeFile(envPath, envContent, 'utf-8');

    logger.info('Created .env file for agent');
  }

  /**
   * Update Python agent code to import and use Hivee SDK
   */
  private async updatePythonAgentToUseSDK(modifiedPath: string): Promise<void> {
    logger.info('Updating agent code to use Hivee SDK');

    // Find main entry point
    const possibleEntryPoints = ['main.py', 'app.py', '__main__.py', 'server.py'];
    let entryPoint: string | null = null;

    for (const filename of possibleEntryPoints) {
      const filePath = path.join(modifiedPath, filename);
      try {
        await fs.access(filePath);
        entryPoint = filePath;
        break;
      } catch {
        continue;
      }
    }

    if (!entryPoint) {
      logger.warn('No entry point found, agent will need to manually import SDK');
      return;
    }

    let content = await fs.readFile(entryPoint, 'utf-8');

    // Check if SDK is already imported
    if (content.includes('from shared import') || content.includes('import shared')) {
      logger.info('Agent already imports shared module, skipping');
      return;
    }

    // Add SDK import and initialization at the top after other imports
    const sdkImport = `
# Hivee Platform Integration (Auto-injected)
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from shared import init_hivee

# Initialize Hivee SDK
try:
    hivee_sdk = init_hivee(agent_name=os.getenv('AGENT_NAME', 'UserAgent'))
    print("[Hivee] SDK initialized successfully")
except Exception as e:
    print(f"[Hivee] Warning: SDK initialization failed: {e}")
    hivee_sdk = None

`;

    // Find position after imports (after last import or from statement)
    const lines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') || line.startsWith('from ')) {
        lastImportIndex = i;
      }
      // Stop if we hit a non-import, non-comment line
      if (line && !line.startsWith('#') && !line.startsWith('import ') && !line.startsWith('from ')) {
        break;
      }
    }

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, sdkImport);
      content = lines.join('\n');
    } else {
      // No imports found, add at the beginning
      content = sdkImport + '\n' + content;
    }

    await fs.writeFile(entryPoint, content, 'utf-8');

    logger.info(`Updated ${path.basename(entryPoint)} to use Hivee SDK`);
  }

  /**
   * Modify JavaScript/TypeScript code
   */
  private async modifyJavaScriptCode(
    originalPath: string,
    modifiedPath: string,
    escrowAddress: string
  ): Promise<{ totalReplacements: number; firstAddress: string | null }> {
    const files = await this.getAllFiles(originalPath, ['.js', '.ts', '.jsx', '.tsx']);
    let totalReplacements = 0;
    let firstAddressFound: string | null = null;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');

      // Extract first address BEFORE replacement
      if (!firstAddressFound) {
        firstAddressFound = this.extractFirstAddress(content);
      }

      // Then replace addresses
      const { modifiedContent, replacements } = this.replaceAddressesInJavaScript(content, escrowAddress);

      const relativePath = path.relative(originalPath, file);
      const outputPath = path.join(modifiedPath, relativePath);

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, modifiedContent, 'utf-8');

      totalReplacements += replacements;
    }

    // Inject hooks
    await this.injectJavaScriptHooks(modifiedPath, escrowAddress);

    return { totalReplacements, firstAddress: firstAddressFound };
  }

  /**
   * Replace addresses in JavaScript/TypeScript code
   */
  private replaceAddressesInJavaScript(
    content: string,
    escrowAddress: string
  ): { modifiedContent: string; replacements: number } {
    let modifiedContent = content;
    let replacements = 0;

    // Ethereum address pattern
    const ethAddressPattern = /(['"`])0x[a-fA-F0-9]{40}\1/g;

    modifiedContent = modifiedContent.replace(ethAddressPattern, (match) => {
      replacements++;
      return match.replace(/0x[a-fA-F0-9]{40}/, escrowAddress);
    });

    // Replace in const/let/var declarations
    const configPatterns = [
      /const\s+\w*[Aa]ddress\w*\s*=\s*['"`]0x[a-fA-F0-9]{40}['"`]/g,
      /let\s+\w*[Aa]ddress\w*\s*=\s*['"`]0x[a-fA-F0-9]{40}['"`]/g,
      /WALLET_ADDRESS:\s*['"`]0x[a-fA-F0-9]{40}['"`]/g,
      /PAYMENT_ADDRESS:\s*['"`]0x[a-fA-F0-9]{40}['"`]/g,
    ];

    configPatterns.forEach(pattern => {
      modifiedContent = modifiedContent.replace(pattern, (match) => {
        replacements++;
        return match.replace(/0x[a-fA-F0-9]{40}/, escrowAddress);
      });
    });

    return { modifiedContent, replacements };
  }

  /**
   * Inject hooks into JavaScript code
   */
  private async injectJavaScriptHooks(modifiedPath: string, escrowAddress: string): Promise<void> {
    const possibleEntryPoints = ['index.js', 'app.js', 'server.js', 'main.js', 'index.ts', 'app.ts'];
    let entryPoint: string | null = null;

    for (const filename of possibleEntryPoints) {
      const filePath = path.join(modifiedPath, filename);
      try {
        await fs.access(filePath);
        entryPoint = filePath;
        break;
      } catch {
        continue;
      }
    }

    if (!entryPoint) {
      logger.warn('No entry point found for JavaScript agent, skipping hook injection');
      return;
    }

    const content = await fs.readFile(entryPoint, 'utf-8');

    const imports = `
// Hivee Platform Injected Code
const crypto = require('crypto');

const ESCROW_ADDRESS = "${escrowAddress}";
const PLATFORM_TASK_REGISTRY = [];

function _hiveeDetectTask(taskData) {
  const taskHash = crypto.createHash('sha256')
    .update(JSON.stringify(taskData))
    .digest('hex');

  const clientHash = crypto.createHash('sha256')
    .update(String(taskData.client_id || 'unknown'))
    .digest('hex');

  const taskRecord = {
    taskHash,
    amount: taskData.amount || 0,
    clientHash,
    timestamp: new Date().toISOString(),
  };

  PLATFORM_TASK_REGISTRY.push(taskRecord);
  return taskHash;
}

function _hiveeGenerateZkProof(taskHash, amount) {
  // Simplified ZK proof for MVP
  const proofData = {
    taskHash,
    amount,
    timestamp: new Date().toISOString(),
  };

  const proofHash = '0x' + crypto.createHash('sha256')
    .update(JSON.stringify(proofData))
    .digest('hex');

  return proofHash;
}

async function _hiveeRequestLoan(amount, expectedRevenue) {
  if (PLATFORM_TASK_REGISTRY.length === 0) {
    throw new Error('No task detected, cannot request loan');
  }

  const latestTask = PLATFORM_TASK_REGISTRY[PLATFORM_TASK_REGISTRY.length - 1];
  const zkProof = _hiveeGenerateZkProof(latestTask.taskHash, expectedRevenue);

  return {
    taskHash: latestTask.taskHash,
    zkProof,
    amount,
    expectedRevenue,
  };
}

`;

    const modifiedContent = imports + '\n' + content;
    await fs.writeFile(entryPoint, modifiedContent, 'utf-8');

    logger.info(`Injected hooks into ${entryPoint}`);
  }

  /**
   * Get all files with specific extensions recursively
   */
  private async getAllFiles(dirPath: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];

    async function traverse(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, venv, etc.
          if (!['node_modules', 'venv', '.git', '__pycache__'].includes(entry.name)) {
            await traverse(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    await traverse(dirPath);
    return files;
  }
}

export const codeModifierService = new CodeModifierService();
