import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger.js';
import { getValidationErrors } from '../utils/validators.js';

/**
 * Custom API Error class for operational errors
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: any[];

  constructor(statusCode: number, message: string, isOperational = true, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly for extending built-in classes
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Global error handler middleware
 * Handles all errors thrown in the application
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any[] = [];

  // Log error details
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    user: (req as any).user?.userId || 'unauthenticated',
  });

  // Handle specific error types
  if (err instanceof ApiError) {
    // Custom API errors
    statusCode = err.statusCode;
    message = err.message;
    if (err.errors) {
      errors = err.errors;
    }
  } else if (err instanceof ZodError) {
    // Zod validation errors
    statusCode = 400;
    message = 'Validation Error';
    errors = getValidationErrors(err);
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Prisma known errors
    statusCode = 400;
    switch (err.code) {
      case 'P2002':
        message = 'Unique constraint violation';
        const target = err.meta?.target as string[] | undefined;
        errors = [{
          field: target ? target.join(', ') : 'unknown',
          message: 'A record with this value already exists'
        }];
        break;
      case 'P2025':
        message = 'Record not found';
        statusCode = 404;
        break;
      case 'P2003':
        message = 'Foreign key constraint failed';
        errors = [{
          field: 'reference',
          message: 'Referenced record does not exist'
        }];
        break;
      case 'P2014':
        message = 'Invalid relationship';
        errors = [{
          field: 'relation',
          message: 'The change would violate a required relation'
        }];
        break;
      case 'P2000':
        message = 'Value too long for column';
        break;
      case 'P2001':
        message = 'Record does not exist';
        statusCode = 404;
        break;
      default:
        message = 'Database error';
        logger.error(`Unhandled Prisma error code: ${err.code}`);
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    // Prisma validation errors
    statusCode = 400;
    message = 'Invalid data provided to database';
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    // Database connection errors
    statusCode = 503;
    message = 'Database connection failed';
    logger.error('Database initialization error:', err);
  } else if (err.name === 'JsonWebTokenError') {
    // JWT errors
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    // JWT expiration
    statusCode = 401;
    message = 'Authentication token has expired';
  } else if (err.name === 'CastError') {
    // MongoDB/Mongoose cast errors (if using)
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.name === 'MulterError') {
    // File upload errors
    statusCode = 400;
    message = `File upload error: ${err.message}`;
  } else if ((err as any).code === 'ECONNREFUSED') {
    // Connection refused (e.g., ML service down)
    statusCode = 503;
    message = 'External service unavailable';
  } else if ((err as any).code === 'ETIMEDOUT') {
    // Request timeout
    statusCode = 504;
    message = 'Request timeout';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      errorType: err.constructor.name,
    }),
  });
};

/**
 * 404 Not Found handler
 * Catches all routes that don't exist
 */
export const notFound = (req: Request, res: Response): void => {
  const message = `Resource not found - ${req.originalUrl}`;
  
  logger.warn('404 Not Found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    message,
    path: req.originalUrl,
    method: req.method,
  });
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch promise rejections
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await getUsers();
 *   res.json(users);
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Helper function to create common API errors
 */
export const createError = {
  badRequest: (message: string, errors?: any[]) => 
    new ApiError(400, message, true, errors),
  
  unauthorized: (message: string = 'Unauthorized') => 
    new ApiError(401, message),
  
  forbidden: (message: string = 'Forbidden') => 
    new ApiError(403, message),
  
  notFound: (message: string = 'Resource not found') => 
    new ApiError(404, message),
  
  conflict: (message: string, errors?: any[]) => 
    new ApiError(409, message, true, errors),
  
  unprocessable: (message: string, errors?: any[]) => 
    new ApiError(422, message, true, errors),
  
  tooManyRequests: (message: string = 'Too many requests') => 
    new ApiError(429, message),
  
  internal: (message: string = 'Internal server error') => 
    new ApiError(500, message, false),
  
  serviceUnavailable: (message: string = 'Service unavailable') => 
    new ApiError(503, message),
};

/**
 * Express error handler for unhandled promise rejections
 */
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Promise Rejection:', reason);
  throw reason;
});

/**
 * Express error handler for uncaught exceptions
 */
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  
  // Give the logger time to write before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});