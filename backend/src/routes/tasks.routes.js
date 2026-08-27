import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as tasks from '../controllers/tasks.controller.js';
import { hexColorPattern } from '../validation/common.js';

export const tasksRouter = Router();
tasksRouter.use(authenticate);
const projectId = param('projectId').isInt({ min: 1 }).toInt();
const taskFields = [body('title').optional().trim().isLength({ min: 1, max: 200 }), body('description').optional().trim().isLength({ max: 5000 }), body('notes').optional().trim().isLength({ max: 5000 }), body('status').optional().isIn(['todo', 'in_progress', 'in_review', 'done']), body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']), body('progress').optional().toInt().isInt({ min: 0, max: 100 }), body('assignee').optional({ nullable: true }).isInt({ min: 1 }).toInt(), body('dueDate').optional({ nullable: true }).isISO8601().toDate(), body('color').optional({ nullable: true }).matches(hexColorPattern)];
const listQuery = [query('status').optional().isIn(['todo', 'in_progress', 'in_review', 'done']), query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']), query('assignee').optional().isInt({ min: 1 }).toInt(), query('search').optional().trim().isLength({ max: 200 }), query('page').optional().toInt().isInt({ min: 1 }), query('limit').optional().toInt().isInt({ min: 1, max: 100 })];
tasksRouter.route('/projects/:projectId/tasks').get([projectId, ...listQuery], validate, tasks.listTasks).post([projectId, body('title').trim().isLength({ min: 1, max: 200 }), ...taskFields], validate, tasks.createTask);
tasksRouter.route('/personal-tasks').get(listQuery, validate, tasks.listPersonalTasks).post([body('title').trim().isLength({ min: 1, max: 200 }), ...taskFields], validate, tasks.createPersonalTask);
tasksRouter.post('/tasks/:taskId/claim', param('taskId').isInt({ min: 1 }).toInt(), validate, tasks.claimTask);
tasksRouter.route('/tasks/:taskId').get(param('taskId').isInt({ min: 1 }).toInt(), validate, tasks.getTask).patch([param('taskId').isInt({ min: 1 }).toInt(), ...taskFields], validate, tasks.updateTask).delete(param('taskId').isInt({ min: 1 }).toInt(), validate, tasks.deleteTask);
