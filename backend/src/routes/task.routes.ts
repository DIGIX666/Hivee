import { Router } from 'express';
import { taskController } from '../controllers/task.controller';

const router = Router();

/**
 * Task Routes
 */

// POST /api/tasks - Create a task (simulation)
router.post('/', taskController.createTask.bind(taskController));

// GET /api/tasks/:taskId - Get a specific task
router.get('/:taskId', taskController.getTaskById.bind(taskController));

// PATCH /api/tasks/:taskId/status - Update task status
router.patch('/:taskId/status', taskController.updateTaskStatus.bind(taskController));

// POST /api/tasks/:taskId/complete - Mark task as completed
router.post('/:taskId/complete', taskController.completeTask.bind(taskController));

// POST /api/tasks/:taskId/paid - Mark task as paid
router.post('/:taskId/paid', taskController.markTaskAsPaid.bind(taskController));

export default router;
