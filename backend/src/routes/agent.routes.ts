import { Router } from 'express';
import multer from 'multer';
import { agentController } from '../controllers/agent.controller';
import { validate } from '../middleware/validate';
import {
  uploadAgentSchema,
  getAgentSchema,
  listAgentsSchema,
  updateAgentStatusSchema,
} from '../validators/agent.validator';
import config from '../config';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: config.storage.uploadDir,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-tar',
      'application/gzip',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only ZIP and TAR files are allowed.'));
    }
  },
});

/**
 * @route   POST /api/agents
 * @desc    Upload a new agent
 * @access  Private
 */
router.post(
  '/',
  upload.single('file'),
  validate(uploadAgentSchema),
  agentController.uploadAgent.bind(agentController)
);

/**
 * @route   GET /api/agents
 * @desc    List agents with filters
 * @access  Public
 */
router.get(
  '/',
  validate(listAgentsSchema, 'query'),
  agentController.listAgents.bind(agentController)
);

/**
 * @route   GET /api/agents/:id
 * @desc    Get agent by ID
 * @access  Public
 */
router.get(
  '/:id',
  validate(getAgentSchema, 'params'),
  agentController.getAgent.bind(agentController)
);

/**
 * @route   GET /api/agents/:id/status
 * @desc    Get agent status
 * @access  Public
 */
router.get(
  '/:id/status',
  validate(getAgentSchema, 'params'),
  agentController.getAgentStatus.bind(agentController)
);

/**
 * @route   GET /api/agents/:id/loans
 * @desc    Get agent loans
 * @access  Public
 */
router.get(
  '/:id/loans',
  validate(getAgentSchema, 'params'),
  agentController.getAgentLoans.bind(agentController)
);

/**
 * @route   GET /api/agents/:id/tasks
 * @desc    Get agent tasks
 * @access  Public
 */
router.get(
  '/:id/tasks',
  validate(getAgentSchema, 'params'),
  agentController.getAgentTasks.bind(agentController)
);

/**
 * @route   GET /api/agents/:id/credit-score
 * @desc    Get agent credit score
 * @access  Public
 */
router.get(
  '/:id/credit-score',
  validate(getAgentSchema, 'params'),
  agentController.getAgentCreditScore.bind(agentController)
);

/**
 * @route   PATCH /api/agents/:id/status
 * @desc    Update agent status (system only)
 * @access  Private/System
 */
router.patch(
  '/:id/status',
  validate(updateAgentStatusSchema),
  agentController.updateAgentStatus.bind(agentController)
);

export default router;
