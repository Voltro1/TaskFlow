import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as projects from '../controllers/projects.controller.js';
import { hexColorPattern, isImageDataUrl, paginationRules, intId } from '../validation/common.js';

export const projectsRouter = Router();

// require authenticated requests
projectsRouter.use(authenticate);
const id = intId('projectId');

// pre-project update conditions
const projectFields = [
  body('name').optional().trim().isLength({ min: 1, max: 120 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('archived').optional().isBoolean().toBoolean(),
  body('color').optional().matches(hexColorPattern),
  body('imageData').optional({ nullable: true }).custom(isImageDataUrl)
];

// listing
const listQuery = [
  query('archived').optional().isBoolean().toBoolean(),
  query('search').optional().trim().isLength({ max: 120 }),
  ...paginationRules()
];

// new project
projectsRouter.route('/')
  .get(listQuery, validate, projects.listProjects)
  .post(
    [
      body('name').trim().isLength({ min: 1, max: 120 }),
      body('description').optional().trim().isLength({ max: 2000 }),
      body('color').optional().matches(hexColorPattern),
      body('imageData').optional({ nullable: true }).custom(isImageDataUrl)
    ],
    validate,
    projects.createProject
  );

// get project details
projectsRouter.route('/:projectId')
  .get(id, validate, projects.getProject)
  .patch([id, ...projectFields], validate, projects.updateProject)
  .delete(id, validate, projects.deleteProject);

// add member
projectsRouter.post('/:projectId/members',
  [
    id,
    body('email').isEmail().normalizeEmail(),
    body('role').isIn(['admin', 'member'])
  ],
  validate,
  projects.addMember
);

// remove member
projectsRouter.delete('/:projectId/members/:userId',
  [id, intId('userId')],
  validate,
  projects.removeMember
);