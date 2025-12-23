import { prisma } from './prisma.service';
import { blockchainService } from './blockchain.service';
import { logger } from '../utils/logger';
import { Decimal } from '@prisma/client/runtime/library';
import config from '../config';

export class LoanService {
  /**
   * Request a loan automatically for a task
   * Creates a loan in PENDING status awaiting a lender
   */
  async requestLoanAutomatically(data: {
    agentId: string;
    agentIdentityId: number;
    escrowAddress: string;
    amount: number;
    zkProofHash: string;
    expectedRevenue: number;
  }) {
    try {
      const { agentId, agentIdentityId, escrowAddress, amount, zkProofHash, expectedRevenue } = data;

      logger.info(`Requesting loan automatically for agent ${agentId}, amount: ${amount}`);

      // 1. Get the credit score (optional, for future lender matching)
      let creditScore = 0;
      try {
        creditScore = await blockchainService.getCreditScore(agentIdentityId);
        logger.info(`Agent ${agentId} credit score: ${creditScore}`);
      } catch (error) {
        logger.warn(`Could not fetch credit score for agent ${agentId}:`, error);
      }

      // 2. Try to find a compatible lender (optional)
      const lender = await this.findCompatibleLender(amount, creditScore);

      let loan;
      if (lender) {
        // CASE 1: Lender found - create loan with lender details
        logger.info(`Found compatible lender: ${lender.name} (${lender.id})`);

        // Calculate interest
        const interestAmount = new Decimal(amount).times(lender.interestRate).dividedBy(10000);
        const expectedRepayment = new Decimal(amount).plus(interestAmount);

        loan = await prisma.loan.create({
          data: {
            borrowerAgentId: agentId,
            lenderAgentId: lender.id,
            principal: new Decimal(amount),
            interestRate: lender.interestRate,
            expectedRepayment,
            status: 'REQUESTED',
            zkProofHash,
            expectedRevenue: new Decimal(expectedRevenue),
          },
        });

        logger.info(`Loan created with lender: ${loan.id}, principal: ${amount}, interest rate: ${lender.interestRate}bp`);

        // Try to send on-chain request
        try {
          const token = config.blockchain.defaultToken || '0x0000000000000000000000000000000000000000';

          const requestId = await blockchainService.requestLoan(
            agentIdentityId,
            escrowAddress,
            escrowAddress,
            token,
            amount.toString(),
            zkProofHash,
            expectedRevenue.toString()
          );

          await prisma.loan.update({
            where: { id: loan.id },
            data: { requestId },
          });

          logger.info(`Loan requested on-chain: requestId=${requestId}, loanId=${loan.id}`);
        } catch (blockchainError) {
          logger.error('Error requesting loan on-chain:', blockchainError);
          logger.warn(`Loan ${loan.id} created in DB but blockchain request failed`);
        }
      } else {
        // CASE 2: No lender found - create loan in PENDING status
        logger.info(`No lender available yet. Creating loan in PENDING status for agent ${agentId}`);

        loan = await prisma.loan.create({
          data: {
            borrowerAgentId: agentId,
            lenderAgentId: null, // No lender yet
            principal: new Decimal(amount),
            interestRate: null, // Will be set when lender is assigned
            expectedRepayment: null, // Will be calculated when lender is assigned
            status: 'PENDING', // Awaiting lender
            zkProofHash,
            expectedRevenue: new Decimal(expectedRevenue),
          },
        });

        logger.info(`Loan created in PENDING status: ${loan.id}, principal: ${amount}, awaiting lender`);
      }

      return loan;
    } catch (error) {
      logger.error('Error requesting loan automatically:', error);
      throw error;
    }
  }

  /**
   * Find a compatible lender for the loan
   */
  private async findCompatibleLender(amount: number, creditScore: number) {
    const lenders = await prisma.lender.findMany({
      where: {
        isActive: true,
        minCreditScore: { lte: creditScore },
        maxLoanAmount: { gte: amount },
        availableFunds: { gte: amount },
      },
      orderBy: { interestRate: 'asc' }, // Best rate first
      take: 1,
    });

    return lenders.length > 0 ? lenders[0] : null;
  }

  /**
   * Get loan by ID
   */
  async getLoanById(loanId: string) {
    try {
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          borrowerAgent: {
            select: { id: true, name: true, escrowAddress: true },
          },
          lenderAgent: {
            select: { id: true, name: true },
          },
          task: true,
        },
      });

      return loan;
    } catch (error) {
      logger.error('Error fetching loan:', error);
      throw error;
    }
  }

  /**
   * Get all loans for an agent (as borrower)
   */
  async getAgentLoans(agentId: string, status?: string) {
    try {
      const where: any = { borrowerAgentId: agentId };
      if (status) {
        where.status = status;
      }

      const loans = await prisma.loan.findMany({
        where,
        include: {
          lenderAgent: {
            select: { id: true, name: true },
          },
          task: {
            select: { id: true, description: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return loans;
    } catch (error) {
      logger.error('Error fetching agent loans:', error);
      throw error;
    }
  }

  /**
   * Approve a loan (called by lender or automatically)
   */
  async approveLoan(loanId: string) {
    try {
      const loan = await prisma.loan.update({
        where: { id: loanId },
        data: { status: 'APPROVED' },
      });

      logger.info(`Loan ${loanId} approved`);
      return loan;
    } catch (error) {
      logger.error('Error approving loan:', error);
      throw error;
    }
  }

  /**
   * Disburse a loan (transfer funds to agent)
   */
  async disburseLoan(loanId: string) {
    try {
      const loan = await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: 'DISBURSED',
          disbursedAt: new Date(),
        },
      });

      logger.info(`Loan ${loanId} disbursed`);

      // Notify task service about loan disbursement
      const { taskService } = await import('./task.service');
      await taskService.onLoanDisbursed(loanId);

      return loan;
    } catch (error) {
      logger.error('Error disbursing loan:', error);
      throw error;
    }
  }

  /**
   * Mark loan as repaid
   */
  async repayLoan(loanId: string, actualRepayment: number) {
    try {
      const loan = await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: 'REPAID',
          actualRepayment: new Decimal(actualRepayment),
          repaidAt: new Date(),
        },
      });

      logger.info(`Loan ${loanId} repaid with amount ${actualRepayment}`);
      return loan;
    } catch (error) {
      logger.error('Error repaying loan:', error);
      throw error;
    }
  }

  /**
   * Reject a loan
   */
  async rejectLoan(loanId: string) {
    try {
      const loan = await prisma.loan.update({
        where: { id: loanId },
        data: { status: 'REJECTED' },
      });

      logger.info(`Loan ${loanId} rejected`);

      // Update related task to FAILED
      const task = await prisma.task.findFirst({
        where: { loanId },
      });

      if (task) {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: 'FAILED' },
        });

        logger.info(`Task ${task.id} marked as FAILED due to loan rejection`);
      }

      return loan;
    } catch (error) {
      logger.error('Error rejecting loan:', error);
      throw error;
    }
  }
}

export const loanService = new LoanService();
