import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as projects from '../controllers/projects.controller.js';
import { hexColorPattern, imageDataUrlPattern } from '../validation/common.js';

export const projectsRouter = Router();
projectsRouter.use(authenticate);
const id = param('projectId').isInt({ min: 1 }).toInt();
const projectFields = [
  body('name').optional().trim().isLength({ min: 1, max: 120 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('archived').optional().isBoolean().toBoolean(),
  body('color').optional().matches(hexColorPattern),
  body('imageData').optional({ nullable: true }).custom((value) => value === null || (typeof value === 'string' && imageDataUrlPattern.test(value)))
];
const listQuery = [query('archived').optional().isBoolean().toBoolean(), query('search').optional().trim().isLength({ max: 120 }), query('page').optional().toInt().isInt({ min: 1 }), query('limit').optional().toInt().isInt({ min: 1, max: 100 })];

projectsRouter.route('/').get(listQuery, validate, projects.listProjects).post([
  body('name').trim().isLength({ min: 1, max: 120 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('color').optional().matches(hexColorPattern),
  body('imageData').optional({ nullable: true }).custom((value) => value === null || (typeof value === 'string' && imageDataUrlPattern.test(value)))
], validate, projects.createProject);
projectsRouter.route('/:projectId').get(id, validate, projects.getProject).patch([id, ...projectFields], validate, projects.updateProject).delete(id, validate, projects.deleteProject);
projectsRouter.post('/:projectId/members', [id, body('email').isEmail().normalizeEmail(), body('role').isIn(['admin', 'member'])], validate, projects.addMember);
projectsRouter.delete('/:projectId/members/:userId', [id, param('userId').isInt({ min: 1 }).toInt()], validate, projects.removeMember);
