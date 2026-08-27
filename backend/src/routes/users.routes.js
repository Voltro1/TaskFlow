import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createUser, deleteUser, getUser, listUsers, updateUser } from '../controllers/users.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';
import * as users from '../services/user.service.js';
import { imageDataUrlPattern } from '../validation/common.js';

export const usersRouter = Router();
usersRouter.use(authenticate);
usersRouter.get('/me', (req, res) => sendSuccess(res, { data: { user: req.user } }));
usersRouter.patch('/me', [
  body('name').optional().trim().isLength({ min: 2, max: 80 }),
  body('username').optional().trim().matches(/^[a-zA-Z0-9_.-]{2,80}$/),
  body('email').optional().isEmail().customSanitizer((value) => String(value).trim().toLowerCase()),
  body('profileImageData').optional({ nullable: true }).custom((value) => value === null || (typeof value === 'string' && imageDataUrlPattern.test(value)))
], validate, asyncHandler(async (req, res) => {
  sendSuccess(res, { data: { user: await users.updateOwnProfile(req.user.id, req.body) } });
}));
usersRouter.patch('/me/password', [body('currentPassword').isString().isLength({ min: 8, max: 128 }), body('newPassword').isString().isLength({ min: 8, max: 128 })], validate, asyncHandler(async (req, res) => {
  await users.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  res.status(204).send();
}));
usersRouter.delete('/me', body('password').isString().isLength({ min: 8, max: 128 }), validate, asyncHandler(async (req, res) => {
  await users.deactivateOwnAccount(req.user.id, req.body.password);
  res.status(204).send();
}));
usersRouter.use(authorize('admin'));
const id = param('userId').isInt({ min: 1 }).toInt();
const fields = [body('username').optional().trim().matches(/^[a-zA-Z0-9_.-]{2,80}$/), body('role').optional().isIn(['user', 'admin']), body('isActive').optional().isBoolean().toBoolean()];

usersRouter.route('/')
  .get([query('page').optional().toInt().isInt({ min: 1 }), query('limit').optional().toInt().isInt({ min: 1, max: 100 }), query('search').optional().trim().isLength({ max: 100 }), query('role').optional().isIn(['user', 'admin']), query('isActive').optional().isBoolean().toBoolean()], validate, listUsers)
  .post([body('name').trim().isLength({ min: 2, max: 80 }), body('username').optional().trim().matches(/^[a-zA-Z0-9_.-]{2,80}$/), body('email').isEmail().customSanitizer((value) => String(value).trim().toLowerCase()), body('password').isString().isLength({ min: 8, max: 128 }), body('role').optional().isIn(['user', 'admin'])], validate, createUser);
usersRouter.route('/:userId').get(id, validate, getUser).patch([id, ...fields], validate, updateUser).delete(id, validate, deleteUser);
