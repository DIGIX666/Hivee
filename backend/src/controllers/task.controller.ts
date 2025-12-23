import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service';
import { logger } from '../utils/logger';

export class TaskController {
  /**
   * Create a new task (for simulation)
   * POST /api/tasks
   */
  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId, clientId, amount, description, loanThreshold } = req.body;

      // Validation
      if (!agentId || !clientId || !amount || !description) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Missing required fields: agentId, clientId, amount, description',
          },
        });
      }

      const task = await taskService.createTask({
        agentId,
        clientId,
        amount: parseFloat(amount),
        description,
        loanThreshold: loanThreshold ? parseFloat(loanThreshold) : undefined,
      });

      logger.info(`Task created via API: ${task.id}`);

      res.status(201).json({
        success: true,
        data: { task },
      });
    } catch (error: any) {
      logger.error('Error in createTask controller:', error);
      next(error);
    }
  }

  /**
   * Get all tasks for an agent
   * GET /api/agents/:agentId/tasks
   */
  async getAgentTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = req.params;
      const { status } = req.query;

      const tasks = await taskService.getAgentTasks(
        agentId,
        status as string | undefined
      );

      res.json({
        success: true,
        data: { tasks },
      });
    } catch (error: any) {
      logger.error('Error in getAgentTasks controller:', error);
      next(error);
    }
  }

  /**
   * Get a specific task by ID
   * GET /api/tasks/:taskId
   */
  async getTaskById(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;

      const task = await taskService.getTaskById(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Task not found',
          },
        });
      }

      res.json({
        success: true,
        data: { task },
      });
    } catch (error: any) {
      logger.error('Error in getTaskById controller:', error);
      next(error);
    }
  }

  /**
   * Update task status
   * PATCH /api/tasks/:taskId/status
   */
  async updateTaskStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Missing required field: status',
          },
        });
      }

      const task = await taskService.updateTaskStatus(taskId, status);

      res.json({
        success: true,
        data: { task },
      });
    } catch (error: any) {
      logger.error('Error in updateTaskStatus controller:', error);
      next(error);
    }
  }

  /**
   * Complete a task
   * POST /api/tasks/:taskId/complete
   */
  async completeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;

      const task = await taskService.completeTask(taskId);

      res.json({
        success: true,
        data: { task },
      });
    } catch (error: any) {
      logger.error('Error in completeTask controller:', error);
      next(error);
    }
  }

  /**
   * Mark task as paid
   * POST /api/tasks/:taskId/paid
   */
  async markTaskAsPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;

      const task = await taskService.markTaskAsPaid(taskId);

      res.json({
        success: true,
        data: { task },
      });
    } catch (error: any) {
      logger.error('Error in markTaskAsPaid controller:', error);
      next(error);
    }
  }
}

export const taskController = new TaskController();
