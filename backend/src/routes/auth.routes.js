import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getCurrentUser, login, register } from '../controllers/auth.controller.js';

export const authRouter = Router();
const credentials = [body('email').isEmail().customSanitizer((value) => String(value).trim().toLowerCase()), body('password').isString().isLength({ min: 8, max: 128 })];

authRouter.post('/register', [body('name').trim().isLength({ min: 2, max: 80 }), body('username').optional().trim().matches(/^[a-zA-Z0-9_.-]{2,80}$/), ...credentials], validate, register);

authRouter.post('/login', credentials, validate, login);

authRouter.get('/me', authenticate, getCurrentUser);
