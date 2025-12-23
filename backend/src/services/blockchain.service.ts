import { ethers } from 'ethers';
import config from '../config';
import { logger } from '../utils/logger';
import { AgentProfile, LoanMatchResult } from '../types';

// Import contract ABIs (these would be generated from compiled contracts)
import AgentIdentityABI from '../../abis/AgentIdentity.json';
import BrokerAgentABI from '../../abis/BrokerAgent.json';
import LenderAgentABI from '../../abis/LenderAgent.json';
import AgentEscrowABI from '../../abis/AgentEscrow.json';

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private agentIdentityContract: ethers.Contract;
  private brokerAgentContract: ethers.Contract;
  private tokenDecimalsCache: Map<string, number> = new Map();

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.blockchain.capxRpcUrl);
    this.wallet = new ethers.Wallet(config.blockchain.privateKey, this.provider);

    this.agentIdentityContract = new ethers.Contract(
      config.blockchain.agentIdentityAddress,
      AgentIdentityABI,
      this.wallet
    );

    this.brokerAgentContract = new ethers.Contract(
      config.blockchain.brokerAgentAddress,
      BrokerAgentABI,
      this.wallet
    );
  }

  /**
   * Get token decimals (with caching)
   * Queries the ERC20 token contract directly
   */
  private async getTokenDecimals(tokenAddress: string): Promise<number> {
    // Check cache first
    if (this.tokenDecimalsCache.has(tokenAddress)) {
      return this.tokenDecimalsCache.get(tokenAddress)!;
    }

    try {
      // Query token contract for decimals
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function decimals() view returns (uint8)'],
        this.provider
      );

      const decimals = await tokenContract.decimals();
      this.tokenDecimalsCache.set(tokenAddress, Number(decimals));

      logger.info(`Token ${tokenAddress} has ${decimals} decimals`);
      return Number(decimals);
    } catch (error) {
      logger.warn(`Failed to get decimals for token ${tokenAddress}, defaulting to 6:`, error);
      // Default to 6 (USDC/USDT standard) if query fails
      return 6;
    }
  }

  /**
   * Register a new agent and get ERC-8004 token ID
   */
  async registerAgent(agentAddress: string): Promise<number> {
    try {
      logger.info(`Registering agent on-chain: ${agentAddress}`);

      const tx = await this.agentIdentityContract.registerAgent(agentAddress);
      const receipt = await tx.wait();

      // Parse event to get token ID
      const event = receipt.logs.find(
        (log: any) => log.topics[0] === ethers.id('AgentRegistered(uint256,address,address)')
      );

      if (!event) {
        throw new Error('AgentRegistered event not found');
      }

      const tokenId = parseInt(event.topics[1], 16);
      logger.info(`Agent registered with token ID: ${tokenId}`);

      return tokenId;
    } catch (error) {
      logger.error('Error registering agent:', error);
      throw error;
    }
  }

  /**
   * Deploy escrow contract for agent
   *
   * IMPORTANT: This requires compiled contract bytecode.
   * Run `forge build` in the contracts directory first, then update
   * the AgentEscrow.json ABI file with the bytecode.
   */
  async deployEscrow(
    borrowerAgent: string,
    agentIdentityId: number
  ): Promise<string> {
    try {
      logger.info(`Deploying escrow for agent ID: ${agentIdentityId}`);

      // Check if ABI includes bytecode
      const abiWithBytecode = AgentEscrowABI as any;
      if (!abiWithBytecode.bytecode || abiWithBytecode.bytecode === '0x') {
        throw new Error(
          'AgentEscrow bytecode not found. Please compile contracts:\n' +
          '  1. cd contracts\n' +
          '  2. forge build\n' +
          '  3. Copy bytecode from out/AgentEscrow.sol/AgentEscrow.json to backend/src/abis/AgentEscrow.json\n' +
          '  OR use the helper script: npm run extract-bytecode'
        );
      }

      const AgentEscrowFactory = new ethers.ContractFactory(
        abiWithBytecode.abi || AgentEscrowABI,
        abiWithBytecode.bytecode,
        this.wallet
      );

      const escrow = await AgentEscrowFactory.deploy(
        borrowerAgent,
        agentIdentityId,
        config.platform.address,
        config.platform.feeRate,
        config.blockchain.x402ProtocolAddress
      );

      await escrow.waitForDeployment();
      const address = await escrow.getAddress();

      logger.info(`Escrow deployed at: ${address}`);
      return address;
    } catch (error) {
      logger.error('Error deploying escrow:', error);
      throw error;
    }
  }

  /**
   * Deploy lender agent contract
   */
  async deployLenderAgent(
    creator: string,
    tokenAddress: string,
    maxLoanAmount: string,
    interestRate: number,
    minCreditScore: number
  ): Promise<string> {
    try {
      logger.info(`Deploying lender agent for creator: ${creator}`);

      // Get token decimals for proper amount parsing
      const decimals = await this.getTokenDecimals(tokenAddress);

      const LenderAgentFactory = new ethers.ContractFactory(
        LenderAgentABI,
        '0x', // Bytecode would be here
        this.wallet
      );

      const lender = await LenderAgentFactory.deploy(
        creator,
        ethers.parseUnits(maxLoanAmount, decimals),
        interestRate,
        minCreditScore,
        config.blockchain.x402ProtocolAddress
      );

      await lender.waitForDeployment();
      const address = await lender.getAddress();

      // Register lender with broker
      await this.registerLenderWithBroker(address);

      logger.info(`Lender agent deployed at: ${address}`);
      return address;
    } catch (error) {
      logger.error('Error deploying lender agent:', error);
      throw error;
    }
  }

  /**
   * Register lender with broker agent
   */
  async registerLenderWithBroker(lenderAddress: string): Promise<void> {
    try {
      const tx = await this.brokerAgentContract.registerLender(lenderAddress);
      await tx.wait();
      logger.info(`Lender registered with broker: ${lenderAddress}`);
    } catch (error) {
      logger.error('Error registering lender with broker:', error);
      throw error;
    }
  }

  /**
   * Request loan through broker
   */
  async requestLoan(
    agentIdentityId: number,
    borrowerAddress: string,
    escrowAddress: string,
    tokenAddress: string,
    amount: string,
    zkProofHash: string,
    expectedRevenue: string
  ): Promise<number> {
    try {
      logger.info(`Requesting loan for agent ID: ${agentIdentityId}, token: ${tokenAddress}`);

      // Get token decimals
      const decimals = await this.getTokenDecimals(tokenAddress);

      const tx = await this.brokerAgentContract.requestLoan(
        agentIdentityId,
        borrowerAddress,
        escrowAddress,
        tokenAddress,
        ethers.parseUnits(amount, decimals),
        zkProofHash,
        ethers.parseUnits(expectedRevenue, decimals)
      );

      const receipt = await tx.wait();

      // Parse event to get request ID
      const event = receipt.logs.find(
        (log: any) => log.topics[0] === ethers.id('LoanRequested(uint256,uint256,address,uint256)')
      );

      if (!event) {
        throw new Error('LoanRequested event not found');
      }

      const requestId = parseInt(event.topics[1], 16);
      logger.info(`Loan requested with ID: ${requestId}`);

      return requestId;
    } catch (error) {
      logger.error('Error requesting loan:', error);
      throw error;
    }
  }

  /**
   * Get agent profile from ERC-8004
   */
  async getAgentProfile(tokenId: number): Promise<AgentProfile> {
    try {
      const profile = await this.agentIdentityContract.getAgentProfile(tokenId);

      return {
        owner: profile.owner,
        agentAddress: profile.agentAddress,
        creditScore: Number(profile.creditScore),
        totalLoans: Number(profile.totalLoans),
        successfulRepayments: Number(profile.successfulRepayments),
        failedRepayments: Number(profile.failedRepayments),
        createdAt: Number(profile.createdAt),
      };
    } catch (error) {
      logger.error('Error getting agent profile:', error);
      throw error;
    }
  }

  /**
   * Get credit score
   */
  async getCreditScore(tokenId: number): Promise<number> {
    try {
      const score = await this.agentIdentityContract.getCreditScore(tokenId);
      return Number(score);
    } catch (error) {
      logger.error('Error getting credit score:', error);
      throw error;
    }
  }

  /**
   * Get loan request status
   */
  async getLoanRequestStatus(requestId: number): Promise<any> {
    try {
      const request = await this.brokerAgentContract.getLoanRequest(requestId);

      // Get token decimals for proper formatting
      const decimals = await this.getTokenDecimals(request.token);

      return {
        agentIdentityId: Number(request.agentIdentityId),
        borrowerAddress: request.borrowerAddress,
        escrowAddress: request.escrowAddress,
        token: request.token,
        amount: ethers.formatUnits(request.amount, decimals),
        zkProofHash: request.zkProofHash,
        expectedRevenue: ethers.formatUnits(request.expectedRevenue, decimals),
        requestedAt: Number(request.requestedAt),
        status: request.status,
      };
    } catch (error) {
      logger.error('Error getting loan request status:', error);
      throw error;
    }
  }

  /**
   * Get registered lenders
   */
  async getRegisteredLenders(): Promise<string[]> {
    try {
      return await this.brokerAgentContract.getRegisteredLenders();
    } catch (error) {
      logger.error('Error getting registered lenders:', error);
      throw error;
    }
  }

  /**
   * Get lender agent stats
   * Note: For multi-token lenders, this returns stats for a specific token
   */
  async getLenderStats(lenderAddress: string, tokenAddress: string): Promise<any> {
    try {
      const lenderContract = new ethers.Contract(
        lenderAddress,
        LenderAgentABI,
        this.provider
      );

      const stats = await lenderContract.getStats();

      // Get token decimals for proper formatting
      const decimals = await this.getTokenDecimals(tokenAddress);

      return {
        totalLent: ethers.formatUnits(stats._totalLent, decimals),
        totalRepaid: ethers.formatUnits(stats._totalRepaid, decimals),
        availableFunds: ethers.formatUnits(stats._availableFunds, decimals),
        activeLoanCount: Number(stats._activeLoanCount),
        tokenAddress,
      };
    } catch (error) {
      logger.error('Error getting lender stats:', error);
      throw error;
    }
  }

  /**
   * Check if lender can provide loan
   */
  async canLenderProvideLoan(
    lenderAddress: string,
    tokenAddress: string,
    amount: string,
    creditScore: number
  ): Promise<boolean> {
    try {
      const lenderContract = new ethers.Contract(
        lenderAddress,
        LenderAgentABI,
        this.provider
      );

      // Get token decimals for proper amount parsing
      const decimals = await this.getTokenDecimals(tokenAddress);

      return await lenderContract.canProvideLoan(
        ethers.parseUnits(amount, decimals),
        creditScore
      );
    } catch (error) {
      logger.error('Error checking if lender can provide loan:', error);
      return false;
    }
  }

  /**
   * Verify lender deposit by checking on-chain balance
   */
  async verifyLenderDeposit(
    lenderAddress: string,
    tokenAddress: string,
    expectedMinimumFunds: string
  ): Promise<{ verified: boolean; actualFunds: string }> {
    try {
      const lenderContract = new ethers.Contract(
        lenderAddress,
        LenderAgentABI,
        this.provider
      );

      const availableFunds = await lenderContract.availableFunds();

      // Get token decimals for proper formatting
      const decimals = await this.getTokenDecimals(tokenAddress);
      const actualFundsFormatted = ethers.formatUnits(availableFunds, decimals);

      const verified = parseFloat(actualFundsFormatted) >= parseFloat(expectedMinimumFunds);

      logger.info(`Lender ${lenderAddress} deposit verification: ${verified} (actual: ${actualFundsFormatted}, expected min: ${expectedMinimumFunds})`);

      return {
        verified,
        actualFunds: actualFundsFormatted,
      };
    } catch (error) {
      logger.error('Error verifying lender deposit:', error);
      throw error;
    }
  }

  /**
   * Update lender configuration on-chain
   */
  async updateLenderConfig(
    lenderAddress: string,
    tokenAddress: string,
    maxLoanAmount?: string,
    interestRate?: number,
    minCreditScore?: number,
    isActive?: boolean
  ): Promise<void> {
    try {
      logger.info(`Updating lender config on-chain: ${lenderAddress}`);

      const lenderContract = new ethers.Contract(
        lenderAddress,
        LenderAgentABI,
        this.wallet
      );

      // Build config object based on provided values
      // If not provided, fetch current values
      const currentConfig = await lenderContract.config();

      // Get token decimals for proper amount parsing
      const decimals = await this.getTokenDecimals(tokenAddress);

      const newConfig = {
        maxLoanAmount: maxLoanAmount
          ? ethers.parseUnits(maxLoanAmount, decimals)
          : currentConfig.maxLoanAmount,
        interestRate: interestRate !== undefined
          ? interestRate
          : currentConfig.interestRate,
        minCreditScore: minCreditScore !== undefined
          ? minCreditScore
          : currentConfig.minCreditScore,
        isActive: isActive !== undefined
          ? isActive
          : currentConfig.isActive,
      };

      const tx = await lenderContract.updateConfig(
        newConfig.maxLoanAmount,
        newConfig.interestRate,
        newConfig.minCreditScore,
        newConfig.isActive
      );

      await tx.wait();
      logger.info(`Lender config updated on-chain: ${lenderAddress}`);
    } catch (error) {
      logger.error('Error updating lender config:', error);
      throw error;
    }
  }

  /**
   * Execute on-chain withdrawal from lender
   * Note: Funds are always sent to the lender creator address (on-chain validation)
   */
  async executeLenderWithdrawal(
    lenderAddress: string,
    tokenAddress: string,
    amount: string
  ): Promise<string> {
    try {
      logger.info(`Executing withdrawal from lender ${lenderAddress}: ${amount} ${tokenAddress}`);

      const lenderContract = new ethers.Contract(
        lenderAddress,
        LenderAgentABI,
        this.wallet
      );

      // Get token decimals for proper amount parsing
      const decimals = await this.getTokenDecimals(tokenAddress);

      const tx = await lenderContract.withdrawFunds(
        tokenAddress,
        ethers.parseUnits(amount, decimals)
      );

      const receipt = await tx.wait();
      logger.info(`Withdrawal executed. Tx hash: ${receipt.hash}`);

      return receipt.hash;
    } catch (error) {
      logger.error('Error executing lender withdrawal:', error);
      throw error;
    }
  }
}

export const blockchainService = new BlockchainService();
export default BlockchainService;
