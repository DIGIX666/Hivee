import { prisma } from './prisma.service';
import { zkProofService } from './zkProof.service';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class TaskService {
  /**
   * Create a new task and trigger the workflow
   */
  async createTask(data: {
    agentId: string;
    clientId: string;
    amount: number;
    description: string;
    loanThreshold?: number;
  }) {
    try {
      const { agentId, clientId, amount, description, loanThreshold = 10.0 } = data;

      // 1. Retrieve the agent
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: { owner: true },
      });

      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      if (agent.status !== 'ACTIVE') {
        throw new Error(`Agent ${agentId} is not active (status: ${agent.status})`);
      }

      // 2. Generate taskHash
      const taskHash = crypto
        .createHash('sha256')
        .update(`${agentId}-${clientId}-${amount}-${Date.now()}`)
        .digest('hex');

      const clientHash = crypto
        .createHash('sha256')
        .update(clientId)
        .digest('hex');

      // 3. Create the task in DB (status: PENDING)
      const task = await prisma.task.create({
        data: {
          agentId,
          taskHash,
          amount,
          description,
          clientHash,
          status: 'PENDING',
          requiresLoan: amount > loanThreshold,
          loanThreshold,
        },
      });

      logger.info(`Task created: ${task.id}, amount: ${amount}, requires loan: ${task.requiresLoan}`);

      // 4. Generate ZK proof and process task asynchronously
      this.generateZKProofAndProcessTask(task.id, agent, amount, description, clientId)
        .catch(err => {
          logger.error(`Error processing task ${task.id}:`, err);
        });

      return task;
    } catch (error) {
      logger.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Generate ZK proof and process the task
   */
  private async generateZKProofAndProcessTask(
    taskId: string,
    agent: any,
    amount: number,
    description: string,
    clientId: string
  ) {
    try {
      // 1. Generate the ZK proof
      const agentAddress = agent.escrowAddress || '0x0000000000000000000000000000000000000000';
      const minLoanAmount = amount * 0.8; // 80% of the amount

      const { proofHash, proofData } = await zkProofService.generateTaskProof(
        clientId,
        amount,
        description,
        agentAddress,
        minLoanAmount
      );

      // 2. Update the task with the ZK proof
      const task = await prisma.task.update({
        where: { id: taskId },
        data: {
          zkProofHash: proofHash,
          zkProofData: proofData,
        },
      });

      logger.info(`ZK proof generated for task ${taskId}: ${proofHash.substring(0, 20)}...`);

      // 3. If loan required, trigger automatic loan request
      if (task.requiresLoan) {
        // Import loan service lazily to avoid circular dependency
        const { loanService } = await import('./loan.service');
        await this.requestLoanForTask(task, agent, proofHash, amount, loanService);
      } else {
        // Otherwise, mark as ready to execute
        await prisma.task.update({
          where: { id: taskId },
          data: { status: 'FUNDED' },
        });

        logger.info(`Task ${taskId} marked as FUNDED (no loan required)`);
      }
    } catch (error) {
      logger.error(`Error generating ZK proof for task ${taskId}:`, error);
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'FAILED' },
      });
    }
  }

  /**
   * Request a loan automatically for a task
   */
  private async requestLoanForTask(
    task: any,
    agent: any,
    zkProofHash: string,
    expectedRevenue: number,
    loanService: any
  ) {
    try {
      logger.info(`Requesting loan for task ${task.id}`);

      // 1. Mark the status as awaiting funds
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'AWAITING_FUNDS' },
      });

      // 2. Request the loan via loan service
      const loanAmount = task.amount * 0.8; // 80% of the estimated amount

      const loan = await loanService.requestLoanAutomatically({
        agentId: agent.id,
        agentIdentityId: agent.agentIdentityId!,
        escrowAddress: agent.escrowAddress!,
        amount: loanAmount,
        zkProofHash,
        expectedRevenue,
      });

      // 3. Link the loan to the task
      await prisma.task.update({
        where: { id: task.id },
        data: { loanId: loan.id },
      });

      logger.info(`Loan requested successfully for task ${task.id}: ${loan.id}`);
    } catch (error) {
      logger.error(`Error requesting loan for task ${task.id}:`, error);
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'FAILED' },
      });
    }
  }

  /**
   * Update task status when loan is disbursed
   */
  async onLoanDisbursed(loanId: string) {
    try {
      const task = await prisma.task.findFirst({
        where: { loanId },
      });

      if (task) {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'FUNDED',
            fundedAt: new Date(),
          },
        });

        logger.info(`Task ${task.id} marked as FUNDED after loan disbursement`);
      }
    } catch (error) {
      logger.error('Error updating task on loan disbursed:', error);
    }
  }

  /**
   * Get all tasks for an agent
   */
  async getAgentTasks(agentId: string, status?: string) {
    try {
      const where: any = { agentId };
      if (status) {
        where.status = status;
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          loan: {
            include: {
              lenderAgent: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return tasks;
    } catch (error) {
      logger.error('Error fetching agent tasks:', error);
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string) {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          agent: {
            select: { id: true, name: true, escrowAddress: true },
          },
          loan: {
            include: {
              lenderAgent: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      return task;
    } catch (error) {
      logger.error('Error fetching task:', error);
      throw error;
    }
  }

  /**
   * Update task status (for manual updates)
   */
  async updateTaskStatus(taskId: string, status: string) {
    try {
      const task = await prisma.task.update({
        where: { id: taskId },
        data: { status: status as any },
      });

      logger.info(`Task ${taskId} status updated to ${status}`);
      return task;
    } catch (error) {
      logger.error('Error updating task status:', error);
      throw error;
    }
  }

  /**
   * Mark task as completed
   */
  async completeTask(taskId: string) {
    try {
      const task = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      logger.info(`Task ${taskId} marked as completed`);
      return task;
    } catch (error) {
      logger.error('Error completing task:', error);
      throw error;
    }
  }

  /**
   * Mark task as paid
   */
  async markTaskAsPaid(taskId: string) {
    try {
      const task = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      logger.info(`Task ${taskId} marked as paid`);
      return task;
    } catch (error) {
      logger.error('Error marking task as paid:', error);
      throw error;
    }
  }
}

export const taskService = new TaskService();
