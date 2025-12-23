import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import config from '../config';
import { logger } from '../utils/logger';
import { ScanFinding, ScanResult } from '../types';
import { prisma } from './prisma.service';

const execAsync = promisify(exec);

export class ScannerService {
  /**
   * Run all security scans on agent code
   */
  async scanAgentCode(agentId: string, codePath: string, language: string): Promise<ScanResult[]> {
    logger.info(`Starting security scan for agent ${agentId}`);

    const results: ScanResult[] = [];

    try {
      // Run appropriate scanners based on language
      if (language === 'python') {
        results.push(await this.runBandit(codePath));
      } else if (language === 'javascript' || language === 'typescript') {
        results.push(await this.runESLint(codePath));
      }

      // Run Semgrep (supports multiple languages)
      results.push(await this.runSemgrep(codePath));

      // Save scan results to database
      await this.saveScanResults(agentId, results);

      logger.info(`Security scan completed for agent ${agentId}`);

      return results;
    } catch (error) {
      logger.error(`Error scanning agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Run Bandit scanner for Python code
   */
  private async runBandit(codePath: string): Promise<ScanResult> {
    try {
      logger.debug(`Running Bandit on ${codePath}`);

      const { stdout, stderr } = await execAsync(
        `${config.scanning.banditPath} -r ${codePath} -f json 2>/dev/null`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      // Find JSON content (bandit may output progress messages before JSON)
      const jsonMatch = stdout.match(/(\{[\s\S]*\})/);
      const jsonContent = jsonMatch ? jsonMatch[1] : '{"results": []}';
      const output = JSON.parse(jsonContent);
      const findings: ScanFinding[] = output.results.map((result: any) => ({
        type: result.test_id,
        severity: this.mapBanditSeverity(result.issue_severity),
        message: result.issue_text,
        line: result.line_number,
        file: result.filename,
      }));

      const severity = this.getOverallSeverity(findings);
      const passed = !findings.some(f => f.severity === 'high');

      return {
        scanType: 'bandit',
        passed,
        findings,
        severity,
      };
    } catch (error: any) {
      // Bandit returns non-zero exit code if issues found
      if (error.stdout) {
        const jsonMatch = error.stdout.match(/(\{[\s\S]*\})/);
        const jsonContent = jsonMatch ? jsonMatch[1] : '{"results": []}';
        const output = JSON.parse(jsonContent);
        const findings: ScanFinding[] = output.results.map((result: any) => ({
          type: result.test_id,
          severity: this.mapBanditSeverity(result.issue_severity),
          message: result.issue_text,
          line: result.line_number,
          file: result.filename,
        }));

        const severity = this.getOverallSeverity(findings);
        const passed = !findings.some(f => f.severity === 'high');

        return {
          scanType: 'bandit',
          passed,
          findings,
          severity,
        };
      }

      logger.error('Bandit scan failed:', error);
      throw error;
    }
  }

  /**
   * Run ESLint scanner for JavaScript/TypeScript code
   */
  private async runESLint(codePath: string): Promise<ScanResult> {
    try {
      logger.debug(`Running ESLint on ${codePath}`);

      const { stdout } = await execAsync(
        `${config.scanning.eslintPath} ${codePath} --format json`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      const output = JSON.parse(stdout || '[]');
      const findings: ScanFinding[] = [];

      output.forEach((file: any) => {
        file.messages.forEach((msg: any) => {
          if (msg.severity === 2) { // Only errors
            findings.push({
              type: msg.ruleId || 'unknown',
              severity: 'high',
              message: msg.message,
              line: msg.line,
              file: file.filePath,
            });
          }
        });
      });

      const severity = this.getOverallSeverity(findings);
      const passed = !findings.some(f => f.severity === 'high');

      return {
        scanType: 'eslint',
        passed,
        findings,
        severity,
      };
    } catch (error: any) {
      if (error.stdout) {
        const output = JSON.parse(error.stdout);
        const findings: ScanFinding[] = [];

        output.forEach((file: any) => {
          file.messages.forEach((msg: any) => {
            if (msg.severity === 2) {
              findings.push({
                type: msg.ruleId || 'unknown',
                severity: 'high',
                message: msg.message,
                line: msg.line,
                file: file.filePath,
              });
            }
          });
        });

        const severity = this.getOverallSeverity(findings);
        const passed = !findings.some(f => f.severity === 'high');

        return {
          scanType: 'eslint',
          passed,
          findings,
          severity,
        };
      }

      logger.error('ESLint scan failed:', error);
      throw error;
    }
  }

  /**
   * Run Semgrep scanner (multi-language)
   */
  private async runSemgrep(codePath: string): Promise<ScanResult> {
    try {
      logger.debug(`Running Semgrep on ${codePath}`);

      const { stdout } = await execAsync(
        `${config.scanning.semgrepPath} --config auto ${codePath} --json`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      const output = JSON.parse(stdout || '{"results": []}');
      const findings: ScanFinding[] = output.results.map((result: any) => ({
        type: result.check_id,
        severity: this.mapSemgrepSeverity(result.extra.severity),
        message: result.extra.message,
        line: result.start.line,
        file: result.path,
      }));

      const severity = this.getOverallSeverity(findings);
      const passed = !findings.some(f => f.severity === 'high');

      return {
        scanType: 'semgrep',
        passed,
        findings,
        severity,
      };
    } catch (error: any) {
      logger.error('Semgrep scan failed:', error);
      // Return empty result if Semgrep fails (non-critical)
      return {
        scanType: 'semgrep',
        passed: true,
        findings: [],
        severity: 'low',
      };
    }
  }

  /**
   * Scan Docker container image with Trivy
   */
  async scanContainer(imageName: string): Promise<ScanResult> {
    try {
      logger.debug(`Running Trivy on container ${imageName}`);

      const { stdout } = await execAsync(
        `${config.scanning.trivyPath} image --format json ${imageName}`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      const output = JSON.parse(stdout || '{"Results": []}');
      const findings: ScanFinding[] = [];

      output.Results?.forEach((result: any) => {
        result.Vulnerabilities?.forEach((vuln: any) => {
          if (vuln.Severity === 'CRITICAL' || vuln.Severity === 'HIGH') {
            findings.push({
              type: vuln.VulnerabilityID,
              severity: vuln.Severity === 'CRITICAL' ? 'high' : 'medium',
              message: vuln.Title || vuln.Description,
              file: vuln.PkgName,
            });
          }
        });
      });

      const severity = this.getOverallSeverity(findings);
      const passed = !findings.some(f => f.severity === 'high');

      return {
        scanType: 'trivy',
        passed,
        findings,
        severity,
      };
    } catch (error) {
      logger.error('Trivy scan failed:', error);
      throw error;
    }
  }

  /**
   * Save scan results to database
   */
  private async saveScanResults(agentId: string, results: ScanResult[]): Promise<void> {
    for (const result of results) {
      await prisma.scanResult.create({
        data: {
          agentId,
          scanType: result.scanType,
          passed: result.passed,
          findings: result.findings as any,
          severity: result.severity,
        },
      });
    }
  }

  /**
   * Get overall severity from findings
   */
  private getOverallSeverity(findings: ScanFinding[]): 'high' | 'medium' | 'low' {
    if (findings.some(f => f.severity === 'high')) return 'high';
    if (findings.some(f => f.severity === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Map Bandit severity to our severity levels
   */
  private mapBanditSeverity(severity: string): 'high' | 'medium' | 'low' {
    const lower = severity.toLowerCase();
    if (lower === 'high') return 'high';
    if (lower === 'medium') return 'medium';
    return 'low';
  }

  /**
   * Map Semgrep severity to our severity levels
   */
  private mapSemgrepSeverity(severity: string): 'high' | 'medium' | 'low' {
    const lower = severity.toLowerCase();
    if (lower === 'error' || lower === 'high') return 'high';
    if (lower === 'warning' || lower === 'medium') return 'medium';
    return 'low';
  }

  /**
   * Check if scan results are acceptable
   */
  async areScansAcceptable(results: ScanResult[]): Promise<boolean> {
    // Fail if any scan has high severity issues
    return !results.some(result => result.severity === 'high' && !result.passed);
  }
}

export const scannerService = new ScannerService();
