import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export function notFound(req, _res, next) { next(Object.assign(new Error(`Route not found: ${req.method} ${req.originalUrl}`), { statusCode: 404, isOperational: true })); }
export function errorHandler(err, req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  if (err instanceof SyntaxError && 'body' in err) { status = 400; message = 'Malformed JSON request body'; }
  if (err.code === 'ER_DUP_ENTRY') { status = 409; message = 'A record with that value already exists'; }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 409;
    message = 'This record is linked to other data and cannot be changed or removed yet';
  }
  logger.error(message, { status, method: req.method, path: req.originalUrl, stack: err.stack });
  res.status(status).json({ success: false, error: { message: status >= 500 && env.nodeEnv === 'production' ? 'Internal server error' : message, ...(err.details && { details: err.details }) } });
}
