import { USER_ROLES } from '../models/User.js';
import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createUser, deleteUser, getUser, listUsers, updateUser } from '../controllers/users.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';
import * as users from '../services/user.service.js';
import { isImageDataUrl, paginationRules, intId } from '../validation/common.js';

export const usersRouter = Router();

// require authenticated requests
usersRouter.use(authenticate);

// get own profile
usersRouter.get('/me', (req, res) =>
  sendSuccess(res, { data: { user: req.user } })
);

// update own profile
usersRouter.patch('/me',
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }),
    body('username')
      .optional()
      .trim()
      .matches(/^[a-zA-Z0-9_.-]{2,80}$/),
    body('email')
      .optional()
      .isEmail()
      .customSanitizer((value) => String(value).trim().toLowerCase()),
    body('profileImageData')
      .optional({ nullable: true })
      .custom(isImageDataUrl)
  ],
  validate,
  asyncHandler(async (req, res) => {
    sendSuccess(res, {
      data: { user: await users.updateOwnProfile(req.user.id, req.body) }
    });
  })
);

// change own password
usersRouter.patch('/me/password',
  [
    body('currentPassword').isString().isLength({ min: 8, max: 128 }),
    body('newPassword').isString().isLength({ min: 8, max: 128 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    await users.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    res.status(204).send();
  })
);

// deactivate own account
usersRouter.delete('/me',
  body('password').isString().isLength({ min: 8, max: 128 }),
  validate,
  asyncHandler(async (req, res) => {
    await users.deactivateOwnAccount(req.user.id, req.body.password);
    res.status(204).send();
  })
);

// require platform admin
usersRouter.use(authorize('admin'));
const id = intId('userId');

// pre-user update conditions
const fields = [
  body('username')
    .optional()
    .trim()
    .matches(/^[a-zA-Z0-9_.-]{2,80}$/),
  body('role').optional().isIn(USER_ROLES),
  body('isActive').optional().isBoolean().toBoolean()
];

// new user
usersRouter.route('/')
  .get(
    [
      ...paginationRules(),
      query('search').optional().trim().isLength({ max: 100 }),
      query('role').optional().isIn(USER_ROLES),
      query('isActive').optional().isBoolean().toBoolean()
    ],
    validate,
    listUsers
  )
  .post(
    [
      body('name').trim().isLength({ min: 2, max: 80 }),
      body('username')
        .optional()
        .trim()
        .matches(/^[a-zA-Z0-9_.-]{2,80}$/),
      body('email')
        .isEmail()
        .customSanitizer((value) => String(value).trim().toLowerCase()),
      body('password').isString().isLength({ min: 8, max: 128 }),
      body('role').optional().isIn(USER_ROLES)
    ],
    validate,
    createUser
  );

// get user details
usersRouter.route('/:userId')
  .get(id, validate, getUser)
  .patch([id, ...fields], validate, updateUser)
  .delete(id, validate, deleteUser);