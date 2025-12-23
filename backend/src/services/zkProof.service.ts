import { logger } from '../utils/logger';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ZKProofService {
  private zkCircuitPath = path.join(__dirname, '../../zk-circuits');
  private useRealZKProof = false; // Set to true when circuits are setup

  /**
   * Generate a ZK proof for a task
   * For MVP: Uses hash-based proof
   * For Production: Uses real ZK-SNARK with circom (when circuits are ready)
   */
  async generateTaskProof(
    clientId: string,
    expectedPayment: number,
    taskDescription: string,
    agentAddress: string,
    minLoanAmount: number
  ): Promise<{ proofHash: string; proofData: any }> {
    try {
      logger.info(`Generating ZK proof for task: ${taskDescription.substring(0, 50)}...`);

      if (this.useRealZKProof) {
        return await this.generateRealZKProof(
          clientId,
          expectedPayment,
          taskDescription,
          agentAddress,
          minLoanAmount
        );
      } else {
        return await this.generateSimplifiedProof(
          clientId,
          expectedPayment,
          taskDescription,
          agentAddress,
          minLoanAmount
        );
      }
    } catch (error) {
      logger.error('Error generating ZK proof:', error);
      throw error;
    }
  }

  /**
   * Simplified proof generation (MVP)
   * Generates a cryptographic hash that proves the task parameters
   */
  private async generateSimplifiedProof(
    clientId: string,
    expectedPayment: number,
    taskDescription: string,
    agentAddress: string,
    minLoanAmount: number
  ): Promise<{ proofHash: string; proofData: any }> {
    // Generate random nonce for uniqueness
    const nonce = Math.floor(Math.random() * 1000000);
    const timestamp = Math.floor(Date.now() / 1000);

    // Hash the client ID to preserve privacy
    const clientIdHash = crypto
      .createHash('sha256')
      .update(clientId)
      .digest('hex');

    const taskDescHash = crypto
      .createHash('sha256')
      .update(taskDescription)
      .digest('hex');

    // Create proof data
    const proofInputs = {
      clientIdHash,
      taskDescHash,
      nonce,
      timestamp,
      agentAddress,
      expectedPayment: Math.floor(expectedPayment * 1e6), // 6 decimals
      minLoanAmount: Math.floor(minLoanAmount * 1e6),
    };

    // Generate proof hash using all inputs
    const proofHash = '0x' + crypto
      .createHash('sha256')
      .update(JSON.stringify(proofInputs))
      .digest('hex');

    const proofData = {
      type: 'simplified',
      version: '1.0',
      inputs: proofInputs,
      proof: {
        algorithm: 'sha256',
        hash: proofHash,
      },
      publicSignals: [
        agentAddress,
        expectedPayment.toString(),
        minLoanAmount.toString(),
      ],
      verifiable: true,
    };

    logger.info(`Simplified ZK proof generated: ${proofHash.substring(0, 20)}...`);

    return {
      proofHash,
      proofData,
    };
  }

  /**
   * Real ZK-SNARK proof generation (Production)
   * Uses circom + snarkjs to generate a Groth16 proof
   */
  private async generateRealZKProof(
    clientId: string,
    expectedPayment: number,
    taskDescription: string,
    agentAddress: string,
    minLoanAmount: number
  ): Promise<{ proofHash: string; proofData: any }> {
    try {
      // 1. Prepare the inputs
      const inputs = {
        clientIdHash: this.hashToField(clientId),
        taskDescHash: this.hashToField(taskDescription),
        nonce: Math.floor(Math.random() * 1000000),
        timestamp: Math.floor(Date.now() / 1000),
        agentAddress: this.addressToField(agentAddress),
        expectedPayment: Math.floor(expectedPayment * 1e6), // 6 decimals
        minLoanAmount: Math.floor(minLoanAmount * 1e6),
      };

      // 2. Write inputs.json
      const inputsPath = path.join(this.zkCircuitPath, 'inputs.json');
      await fs.writeFile(inputsPath, JSON.stringify(inputs));

      // 3. Generate the proof with snarkjs
      const wasmPath = path.join(this.zkCircuitPath, 'build/task_proof_js/task_proof.wasm');
      const zkeyPath = path.join(this.zkCircuitPath, 'keys/task_proof.zkey');

      await execAsync(
        `cd ${this.zkCircuitPath} && ` +
        `snarkjs groth16 fullprove inputs.json ${wasmPath} ${zkeyPath} proof.json public.json`
      );

      // 4. Read the generated proof
      const proofData = JSON.parse(
        await fs.readFile(path.join(this.zkCircuitPath, 'proof.json'), 'utf-8')
      );
      const publicSignals = JSON.parse(
        await fs.readFile(path.join(this.zkCircuitPath, 'public.json'), 'utf-8')
      );

      // 5. Calculate the proof hash
      const proofHash = this.computeProofHash(proofData, publicSignals);

      logger.info(`Real ZK-SNARK proof generated: ${proofHash.substring(0, 20)}...`);

      return {
        proofHash,
        proofData: {
          type: 'zk-snark',
          version: 'groth16',
          proof: proofData,
          publicSignals,
          inputs: inputs,
        },
      };
    } catch (error) {
      logger.error('Error generating real ZK proof:', error);
      throw error;
    }
  }

  /**
   * Verify a ZK proof
   */
  async verifyProof(proofData: any): Promise<boolean> {
    try {
      if (proofData.type === 'simplified') {
        // For simplified proofs, just verify the hash matches
        const recomputedHash = '0x' + crypto
          .createHash('sha256')
          .update(JSON.stringify(proofData.inputs))
          .digest('hex');

        return recomputedHash === proofData.proof.hash;
      } else if (proofData.type === 'zk-snark') {
        // For real ZK proofs, use snarkjs to verify
        const vkeyPath = path.join(this.zkCircuitPath, 'keys/verification_key.json');

        // Write temporary proof files
        await fs.writeFile(
          path.join(this.zkCircuitPath, 'temp_proof.json'),
          JSON.stringify(proofData.proof)
        );
        await fs.writeFile(
          path.join(this.zkCircuitPath, 'temp_public.json'),
          JSON.stringify(proofData.publicSignals)
        );

        const { stdout } = await execAsync(
          `cd ${this.zkCircuitPath} && ` +
          `snarkjs groth16 verify ${vkeyPath} temp_public.json temp_proof.json`
        );

        return stdout.includes('OK');
      }

      return false;
    } catch (error) {
      logger.error('Error verifying ZK proof:', error);
      return false;
    }
  }

  /**
   * Convert string to field element for circom
   */
  private hashToField(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Convert Ethereum address to field element
   */
  private addressToField(address: string): string {
    return address.replace('0x', '');
  }

  /**
   * Compute proof hash for storage
   */
  private computeProofHash(proof: any, publicSignals: any[]): string {
    return '0x' + crypto
      .createHash('sha256')
      .update(JSON.stringify({ proof, publicSignals }))
      .digest('hex');
  }

  /**
   * Enable real ZK proof generation (call this after circuits are setup)
   */
  enableRealZKProof() {
    this.useRealZKProof = true;
    logger.info('Real ZK-SNARK proof generation enabled');
  }

  /**
   * Check if real ZK proof is available
   */
  isRealZKProofAvailable(): boolean {
    return this.useRealZKProof;
  }
}

export const zkProofService = new ZKProofService();
