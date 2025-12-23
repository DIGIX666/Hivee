import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service';
import { blockchainService } from '../services/blockchain.service';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class AgentController {
  /**
   * Upload a new agent
   */
  async uploadAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, language } = req.body;
      // Get walletAddress from body, or use a default test address for development
      const walletAddress = req.body.walletAddress || '0x0000000000000000000000000000000000000DEV';
      const file = req.file;

      if (!file && !req.body.gitUrl) {
        throw new ApiError(400, 'Either file or gitUrl is required');
      }

      // Get or create user
      let user = await prisma.user.findUnique({
        where: { walletAddress },
      });

      if (!user) {
        user = await prisma.user.create({
          data: { walletAddress },
        });
      }

      // Generate code hash
      const codeHash = crypto.randomBytes(32).toString('hex');

      // Create agent record
      const agent = await prisma.agent.create({
        data: {
          ownerId: user.id,
          name,
          description,
          language,
          codeHash,
          originalCodePath: file ? file.path : req.body.gitUrl,
          status: 'PENDING',
        },
      });

      logger.info(`Agent uploaded: ${agent.id}`);

      // Queue for processing (security scan, code modification, deployment)
      const { queueService } = await import('../services/queue.service');
      await queueService.queueAgentProcessing(agent.id);

      res.status(201).json({
        success: true,
        data: {
          agent: {
            id: agent.id,
            name: agent.name,
            status: agent.status,
            createdAt: agent.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.findUnique({
        where: { id },
        include: {
          owner: true,
          loans: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          tasks: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!agent) {
        throw new ApiError(404, 'Agent not found');
      }

      // Get on-chain data if agent is active
      let onChainData = null;
      if (agent.agentIdentityId !== null) {
        try {
          onChainData = await blockchainService.getAgentProfile(agent.agentIdentityId);
        } catch (error) {
          logger.warn(`Failed to fetch on-chain data for agent ${id}:`, error);
        }
      }

      res.json({
        success: true,
        data: {
          agent: {
            ...agent,
            onChain: onChainData,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List agents with filters
   */
  async listAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const { ownerId, status, page = 1, limit = 10 } = req.query;

      const where: any = {};
      if (ownerId) where.ownerId = ownerId as string;
      if (status) where.status = status as string;

      const skip = (Number(page) - 1) * Number(limit);

      const [agents, total] = await Promise.all([
        prisma.agent.findMany({
          where,
          include: {
            owner: {
              select: {
                walletAddress: true,
              },
            },
          },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.agent.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          agents,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get agent status
   */
  async getAgentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          status: true,
          escrowAddress: true,
          agentIdentityId: true,
          containerId: true,
          updatedAt: true,
        },
      });

      if (!agent) {
        throw new ApiError(404, 'Agent not found');
      }

      res.json({
        success: true,
        data: { agent },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get agent loans
   */
  async getAgentLoans(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.query;

      const where: any = { borrowerAgentId: id };
      if (status) where.status = status as string;

      const loans = await prisma.loan.findMany({
        where,
        include: {
          lenderAgent: {
            select: {
              id: true,
              name: true,
              contractAddress: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: { loans },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get agent tasks
   */
  async getAgentTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.query;

      const where: any = { agentId: id };
      if (status) where.status = status as string;

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

      res.json({
        success: true,
        data: { tasks },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update agent status (admin/system only)
   */
  async updateAgentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const agent = await prisma.agent.update({
        where: { id },
        data: { status },
      });

      logger.info(`Agent ${id} status updated to ${status}`);

      res.json({
        success: true,
        data: { agent },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get agent credit score
   */
  async getAgentCreditScore(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.findUnique({
        where: { id },
        select: { agentIdentityId: true },
      });

      if (!agent || agent.agentIdentityId === null) {
        throw new ApiError(404, 'Agent identity not found');
      }

      const creditScore = await blockchainService.getCreditScore(agent.agentIdentityId);

      res.json({
        success: true,
        data: { creditScore },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const agentController = new AgentController();
