import { validationResult } from 'express-validator';
import { AppError } from '../utils/app-error.js';

export function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError('Validation failed', 422, errors.array().map(({ path, msg }) => ({ field: path, message: msg }))));
  next();
}
