import path from 'path';
import fs from 'fs/promises';
import extract from 'extract-zip';
import simpleGit from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { prisma } from './prisma.service';
import { scannerService } from './scanner.service';
import { codeModifierService } from './codeModifier.service';
import { blockchainService } from './blockchain.service';
import config from '../config';

const execAsync = promisify(exec);

export class AgentProcessorService {
  /**
   * Process uploaded agent through the full pipeline
   */
  async processAgent(agentId: string): Promise<void> {
    logger.info(`Starting processing pipeline for agent ${agentId}`);

    try {
      // 1. Get agent details
      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // 2. Extract agent code
      await this.updateAgentStatus(agentId, 'SCANNING');
      const extractedPath = await this.extractAgentCode(agent.originalCodePath, agentId);

      // 3. Run security scans
      logger.info(`Running security scans for agent ${agentId}`);
      const scanResults = await scannerService.scanAgentCode(
        agentId,
        extractedPath,
        agent.language
      );

      const scansAcceptable = await scannerService.areScansAcceptable(scanResults);

      if (!scansAcceptable) {
        await this.updateAgentStatus(agentId, 'SCAN_FAILED');
        logger.warn(`Security scans failed for agent ${agentId}`);
        return;
      }

      // 4. Register agent on-chain and deploy escrow
      logger.info(`Registering agent ${agentId} on-chain`);
      // Generate deterministic address from agent ID (UUID = 32 hex chars, pad to 40 for Ethereum address)
      const addressHex = `0x${agentId.replace(/-/g, '').padEnd(40, '0')}`;
      const agentAddress = ethers.getAddress(addressHex); // Validates and checksums the address
      const agentIdentityId = await blockchainService.registerAgent(agentAddress);

      const escrowAddress = await blockchainService.deployEscrow(agentAddress, agentIdentityId);

      await prisma.agent.update({
        where: { id: agentId },
        data: {
          agentIdentityId,
          escrowAddress,
        },
      });

      // 5. Modify agent code
      await this.updateAgentStatus(agentId, 'MODIFYING');
      logger.info(`Modifying code for agent ${agentId}`);

      const modification = await codeModifierService.modifyAgentCode(
        extractedPath,
        agent.language,
        escrowAddress,
        agentIdentityId,
        config.brokerApiUrl || 'http://broker-agent:8001'
      );

      await prisma.agent.update({
        where: { id: agentId },
        data: {
          modifiedCodePath: modification.modifiedPath,
          originalPaymentAddress: modification.originalPaymentAddress,
        },
      });

      logger.info(
        `Code modified: ${modification.addressesReplaced} addresses replaced, ` +
        `original payment address: ${modification.originalPaymentAddress || 'none found'}, ` +
        `hooks injected: ${modification.hooksInjected.join(', ')}`
      );

      // 6. Build Docker container
      await this.updateAgentStatus(agentId, 'DEPLOYING');
      logger.info(`Building container for agent ${agentId}`);

      const containerId = await this.buildAndDeployContainer(
        agentId,
        modification.modifiedPath,
        agent.language
      );

      // 7. Scan container
      const containerScanResult = await scannerService.scanContainer(`agent-${agentId}`);
      if (!containerScanResult.passed) {
        await this.updateAgentStatus(agentId, 'FAILED');
        logger.warn(`Container scan failed for agent ${agentId}`);
        return;
      }

      // 8. Mark as active
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          containerId,
          status: 'ACTIVE',
        },
      });

      logger.info(`Agent ${agentId} successfully processed and deployed`);
    } catch (error) {
      logger.error(`Error processing agent ${agentId}:`, error);
      await this.updateAgentStatus(agentId, 'FAILED');
      throw error;
    }
  }

  /**
   * Extract agent code from ZIP or Git
   */
  private async extractAgentCode(sourcePath: string, agentId: string): Promise<string> {
    // Use absolute path for extract-zip
    const extractPath = path.resolve(path.join(config.storage.agentCodeDir, agentId, 'original'));
    await fs.mkdir(extractPath, { recursive: true });

    if (sourcePath.startsWith('http')) {
      // Git repository
      logger.info(`Cloning repository: ${sourcePath}`);
      const git = simpleGit();
      await git.clone(sourcePath, extractPath);
    } else {
      // ZIP file
      logger.info(`Extracting ZIP: ${sourcePath}`);
      await extract(sourcePath, { dir: extractPath });
    }

    return extractPath;
  }

  /**
   * Build and deploy Docker container
   */
  private async buildAndDeployContainer(
    agentId: string,
    codePath: string,
    language: string
  ): Promise<string> {
    const imageName = `agent-${agentId}`;
    const containerName = `agent-container-${agentId}`;

    // Create Dockerfile
    const dockerfile = this.generateDockerfile(language);
    await fs.writeFile(path.join(codePath, 'Dockerfile'), dockerfile);

    // Build image
    logger.info(`Building Docker image: ${imageName}`);
    await execAsync(`docker build -t ${imageName} ${codePath}`);

    // Run container with resource limits
    logger.info(`Starting container: ${containerName}`);
    const { stdout } = await execAsync(
      `docker run -d --name ${containerName} ` +
      `--memory="512m" --cpus="0.5" ` +
      `--network="bridge" ` +
      `-e ESCROW_ADDRESS="$(grep ESCROW_ADDRESS ${codePath}/* | head -1 | cut -d'"' -f2)" ` +
      `${imageName}`
    );

    const containerId = stdout.trim();
    logger.info(`Container started: ${containerId}`);

    return containerId;
  }

  /**
   * Generate Dockerfile based on language
   */
  private generateDockerfile(language: string): string {
    if (language === 'python') {
      return `
FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || true

# Copy application code
COPY . .

# Security: Run as non-root user
RUN useradd -m -u 1000 agentuser && chown -R agentuser:agentuser /app
USER agentuser

# Resource limits
ENV PYTHONUNBUFFERED=1
ENV MAX_MEMORY=512M

# Expose port (if needed)
EXPOSE 8000

# Run application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`;
    } else {
      // JavaScript/TypeScript
      return `
FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production || npm install --only=production

# Copy application code
COPY . .

# Build if TypeScript
RUN if [ -f "tsconfig.json" ]; then npm run build || true; fi

# Security: Run as non-root user
RUN useradd -m -u 1000 agentuser && chown -R agentuser:agentuser /app
USER agentuser

# Expose port
EXPOSE 3000

# Run application
CMD ["node", "index.js"]
`;
    }
  }

  /**
   * Update agent status
   */
  private async updateAgentStatus(agentId: string, status: string): Promise<void> {
    await prisma.agent.update({
      where: { id: agentId },
      data: { status },
    });
  }

  /**
   * Stop and remove agent container
   */
  async stopAgent(agentId: string): Promise<void> {
    try {
      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      if (!agent || !agent.containerId) {
        throw new Error('Agent container not found');
      }

      logger.info(`Stopping agent ${agentId}`);

      await execAsync(`docker stop ${agent.containerId}`);
      await execAsync(`docker rm ${agent.containerId}`);

      await prisma.agent.update({
        where: { id: agentId },
        data: { status: 'PAUSED' },
      });

      logger.info(`Agent ${agentId} stopped`);
    } catch (error) {
      logger.error(`Error stopping agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Restart agent container
   */
  async restartAgent(agentId: string): Promise<void> {
    try {
      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      if (!agent || !agent.containerId) {
        throw new Error('Agent container not found');
      }

      logger.info(`Restarting agent ${agentId}`);

      await execAsync(`docker restart ${agent.containerId}`);

      await prisma.agent.update({
        where: { id: agentId },
        data: { status: 'ACTIVE' },
      });

      logger.info(`Agent ${agentId} restarted`);
    } catch (error) {
      logger.error(`Error restarting agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get agent container logs
   */
  async getAgentLogs(agentId: string, lines: number = 100): Promise<string> {
    try {
      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      if (!agent || !agent.containerId) {
        throw new Error('Agent container not found');
      }

      const { stdout } = await execAsync(`docker logs --tail ${lines} ${agent.containerId}`);
      return stdout;
    } catch (error) {
      logger.error(`Error getting agent logs ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get agent container stats
   */
  async getAgentStats(agentId: string): Promise<any> {
    try {
      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      if (!agent || !agent.containerId) {
        throw new Error('Agent container not found');
      }

      const { stdout } = await execAsync(
        `docker stats ${agent.containerId} --no-stream --format "{{json .}}"`
      );

      return JSON.parse(stdout);
    } catch (error) {
      logger.error(`Error getting agent stats ${agentId}:`, error);
      throw error;
    }
  }
}

export const agentProcessorService = new AgentProcessorService();
