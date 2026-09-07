import { hexColorPattern } from '../validation/common.js';
import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as teams from '../controllers/teams.controller.js';
export const teamsRouter = Router();

// require authenticated requests
teamsRouter.use(authenticate);
const id = param('teamId').toInt().isInt({ min: 1 });

// pre-team update conditions
const fields = [
  body('name').optional().trim().isLength({ min: 1, max: 120 }),
  body('description').optional().trim().isLength({ max: 2000 })
];

// new team
teamsRouter.route('/')
  .get(teams.listTeams)
  .post(
    [
      body('name').trim().isLength({ min: 1, max: 120 }),
      body('description').optional().trim().isLength({ max: 2000 })
    ],
    validate,
    teams.createTeam
  );

// get team details
teamsRouter.route('/:teamId')
  .get(id, validate, teams.getTeam)
  .patch([id, ...fields], validate, teams.updateTeam)
  .delete(id, validate, teams.deleteTeam);

// add member
teamsRouter.post('/:teamId/members',
  [
    id,
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'member']),
    body('rankId').optional({ nullable: true }).isInt({ min: 1 }).toInt()
  ],
  validate,
  teams.addMember
);

// update member role
teamsRouter.patch('/:teamId/members/:userId/role',
  [
    id,
    param('userId').toInt().isInt({ min: 1 }),
    body('role').isIn(['admin', 'member'])
  ],
  validate,
  teams.updateMemberRole
);

// update member rank
teamsRouter.patch('/:teamId/members/:userId/rank',
  [
    id,
    param('userId').toInt().isInt({ min: 1 }),
    body('rankId').optional({ nullable: true }).isInt({ min: 1 }).toInt()
  ],
  validate,
  teams.updateMemberRank
);

// leave team
teamsRouter.delete('/:teamId/members/me', id, validate, teams.leaveTeam);

// remove member
teamsRouter.delete('/:teamId/members/:userId',
  [id, param('userId').toInt().isInt({ min: 1 })],
  validate,
  teams.removeMember
);

// list ranks
teamsRouter.get('/:teamId/ranks', id, validate, teams.listRanks);

// create rank
teamsRouter.post('/:teamId/ranks',
  [
    id,
    body('name').trim().isLength({ min: 1, max: 80 }),
    body('color').optional().matches(hexColorPattern)
  ],
  validate,
  teams.createRank
);

// update rank
teamsRouter.patch('/:teamId/ranks/:rankId',
  [
    id,
    param('rankId').toInt().isInt({ min: 1 }),
    body('name').optional().trim().isLength({ min: 1, max: 80 }),
    body('color').optional().matches(hexColorPattern)
  ],
  validate,
  teams.updateRank
);

// delete rank
teamsRouter.delete('/:teamId/ranks/:rankId',
  [id, param('rankId').toInt().isInt({ min: 1 })],
  validate,
  teams.deleteRank
);

// list invitations
teamsRouter.get('/:teamId/invitations', id, validate, teams.listInvitations);

// remove pending invitation
teamsRouter.delete('/:teamId/invitations/:invitationId',
  [id, param('invitationId').toInt().isInt({ min: 1 })],
  validate,
  teams.revokeInvitation
);