import { USER_ROLES } from '../models/User.js';
import { paginationRules, intId } from '../validation/common.js';
import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';
import * as users from '../services/user.service.js';
import { query as sqlQuery, initializeSchema } from '../config/database.js';

export const adminRouter = Router();

// require platform admin
adminRouter.use(authenticate, authorize('admin'));

// get platform metrics
adminRouter.get('/dashboard',
  asyncHandler(async (_req, res) => {
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
      sqlQuery(
        'SELECT COUNT(*) AS total FROM users WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)'
      ),
      sqlQuery(
        'SELECT COUNT(*) AS total FROM users WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)'
      ),
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
  })
);

// list platform users
adminRouter.get('/users',
  [
    ...paginationRules(),
    query('search').optional().trim().isLength({ max: 100 }),
    query('role').optional().isIn(USER_ROLES),
    query('isActive').optional().isBoolean().toBoolean()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await users.listUsers(req.query);
    sendSuccess(res, {
      data: { users: result.users },
      meta: { pagination: result.pagination }
    });
  })
);

// update platform user
adminRouter.patch('/users/:userId',
  [
    intId('userId'),
    body('role').optional().isIn(USER_ROLES),
    body('isActive').optional().isBoolean().toBoolean()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const user = await users.updateUser(req.params.userId, req.body, req.user);
    sendSuccess(res, { data: { user } });
  })
);

// initialize database schema
adminRouter.post('/schema/init',
  asyncHandler(async (_req, res) => {
    await initializeSchema();
    sendSuccess(res, {
      data: {
        message: 'Database schema created or verified successfully'
      }
    });
  })
);