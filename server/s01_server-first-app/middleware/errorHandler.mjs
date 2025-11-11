 
 
import { secureLog } from '../../../shared/utils/logger.mjs';

// Common error handler middleware
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (err, req, res, next) => {
  // secureLog sanitizes all inputs to prevent log injection
  secureLog.error('Route error:', err.message);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    error: message
  });
};