import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';
import * as users from '../services/user.service.js';
import { query as sqlQuery, initializeSchema } from '../config/database.js';

export const adminRouter = Router();
adminRouter.use(authenticate, authorize('admin'));

adminRouter.get('/dashboard', asyncHandler(async (_req, res) => {
  const [
    usersCount,
    adminsCount,
    activeProjectsCount,
    archivedProjectsCount,
    newUsersCount,
    newUsersTodayCount,
    disabledUsersCount,
    activeUsersCount
  ] = await Promise.all([
    sqlQuery('SELECT COUNT(*) AS total FROM users'),
    sqlQuery("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'"),
    sqlQuery('SELECT COUNT(*) AS total FROM projects WHERE archived = 0'),
    sqlQuery('SELECT COUNT(*) AS total FROM projects WHERE archived = 1'),
    sqlQuery("SELECT COUNT(*) AS total FROM users WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)"),
    sqlQuery("SELECT COUNT(*) AS total FROM users WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)"),
    sqlQuery('SELECT COUNT(*) AS total FROM users WHERE is_active = 0'),
    sqlQuery('SELECT COUNT(*) AS total FROM users WHERE is_active = 1')
  ]);
  sendSuccess(res, {
    data: {
      metrics: {
        users: usersCount[0].total,
        admins: adminsCount[0].total,
        activeUsers: activeUsersCount[0].total,
        activeProjects: activeProjectsCount[0].total,
        archivedProjects: archivedProjectsCount[0].total,
        newUsers: newUsersCount[0].total,
        newUsersToday: newUsersTodayCount[0].total,
        disabledUsers: disabledUsersCount[0].total
      }
    }
  });
}));

adminRouter.get('/users', [
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('role').optional().isIn(['user', 'admin']),
  query('isActive').optional().isBoolean().toBoolean()
], validate, asyncHandler(async (req, res) => {
  const result = await users.listUsers(req.query);
  sendSuccess(res, { data: { users: result.users }, meta: { pagination: result.pagination } });
}));

adminRouter.patch('/users/:userId', [param('userId').isInt({ min: 1 }).toInt(), body('role').optional().isIn(['user', 'admin']), body('isActive').optional().isBoolean().toBoolean()], validate, asyncHandler(async (req, res) => {
  const user = await users.updateUser(req.params.userId, req.body, req.user);
  sendSuccess(res, { data: { user } });
}));

adminRouter.post('/schema/init', asyncHandler(async (_req, res) => {
  await initializeSchema();
  sendSuccess(res, {
    data: {
      message: 'Database schema created or verified successfully'
    }
  });
}));
