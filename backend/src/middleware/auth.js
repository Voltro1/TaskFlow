import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { findUserById } from '../services/user.service.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer ')) throw new AppError('Authentication required. Use a Bearer token.', 401);
  let payload;
  try { payload = jwt.verify(header.slice(7), env.jwtSecret); } catch { throw new AppError('Invalid or expired token', 401); }
  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId < 1) throw new AppError('Invalid or expired token', 401);
  const user = await findUserById(userId);
  if (!user || !user.isActive) throw new AppError('Account is unavailable', 401);
  req.user = user;
  next();
});

export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) return next(new AppError('Insufficient permissions', 403));
  next();
};
