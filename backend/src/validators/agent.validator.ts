import Joi from 'joi';

export const uploadAgentSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().optional().max(500),
  language: Joi.string().valid('python', 'javascript', 'typescript').required(),
  gitUrl: Joi.string().uri().optional(),
});

export const getAgentSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const listAgentsSchema = Joi.object({
  ownerId: Joi.string().uuid().optional(),
  status: Joi.string()
    .valid('PENDING', 'SCANNING', 'SCAN_FAILED', 'MODIFYING', 'DEPLOYING', 'ACTIVE', 'PAUSED', 'FAILED')
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export const updateAgentStatusSchema = Joi.object({
  id: Joi.string().uuid().required(),
  status: Joi.string()
    .valid('PENDING', 'SCANNING', 'SCAN_FAILED', 'MODIFYING', 'DEPLOYING', 'ACTIVE', 'PAUSED', 'FAILED')
    .required(),
});
