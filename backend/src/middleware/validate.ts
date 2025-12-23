import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from './errorHandler';

export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return next(new ApiError(400, `Validation error: ${errorMessage}`));
    }

    // Replace with validated value
    req[property] = value;
    next();
  };
};
