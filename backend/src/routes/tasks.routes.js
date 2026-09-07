import { TASK_STATUSES, TASK_PRIORITIES } from '../models/Task.js';
import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as tasks from '../controllers/tasks.controller.js';
import { hexColorPattern, paginationRules, intId } from '../validation/common.js';

export const tasksRouter = Router();

// require authenticated requests
tasksRouter.use(authenticate);
const projectId = intId('projectId');

// pre-task update conditions
const taskFields = [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 5000 }),
  body('notes').optional().trim().isLength({ max: 5000 }),
  body('status').optional().isIn(TASK_STATUSES),
  body('priority').optional().isIn(TASK_PRIORITIES),
  body('progress').optional().toInt().isInt({ min: 0, max: 100 }),
  body('assignee').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('dueDate').optional({ nullable: true }).isISO8601().toDate(),
  body('color').optional({ nullable: true }).matches(hexColorPattern)
];

// listing
const listQuery = [
  query('status').optional().isIn(TASK_STATUSES),
  query('priority').optional().isIn(TASK_PRIORITIES),
  query('assignee').optional().isInt({ min: 1 }).toInt(),
  query('search').optional().trim().isLength({ max: 200 }),
  ...paginationRules()
];

// project tasks
tasksRouter.route('/projects/:projectId/tasks')
  .get([projectId, ...listQuery], validate, tasks.listTasks)
  .post(
    [
      projectId,
      body('title').trim().isLength({ min: 1, max: 200 }),
      ...taskFields
    ],
    validate,
    tasks.createTask
);

// personal tasks
tasksRouter.route('/personal-tasks')
  .get(listQuery, validate, tasks.listPersonalTasks)
  .post(
    [body('title').trim().isLength({ min: 1, max: 200 }), ...taskFields],
    validate,
    tasks.createPersonalTask
);

// claim task
tasksRouter.post('/tasks/:taskId/claim',
  intId('taskId'),
  validate,
  tasks.claimTask
);

// get task details
tasksRouter.route('/tasks/:taskId')
  .get(intId('taskId'), validate, tasks.getTask)
  .patch([intId('taskId'), ...taskFields], validate, tasks.updateTask)
  .delete(intId('taskId'), validate, tasks.deleteTask);