// @ts-nocheck
/**
 * Global Error Handler Middleware
 * 
 * Centralized error handling for Express application.
 * Provides consistent error responses and logging.
 * 
 * Requirements: 1.2, 1.5, 13.5
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../services/logger';

const logger = createLogger('ErrorHandler');

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default to 500 server error
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  // Handle known errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
  } else if (err.name === 'ResourceNotFoundException') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.name === 'ConditionalCheckFailedException') {
    statusCode = 409;
    message = 'Resource already exists';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error', err, {
      path: req.path,
      method: req.method,
      statusCode,
    });
  } else {
    logger.warn('Client error', {
      path: req.path,
      method: req.method,
      statusCode,
      message,
    });
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.message,
      }),
    },
  });
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      message: 'Route not found',
      statusCode: 404,
      path: req.path,
    },
  });
}

/**
 * Async handler wrapper
 * Catches errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
