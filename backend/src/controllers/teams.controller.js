import * as teams from '../services/team.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';

// list teams
export const listTeams = asyncHandler(async (req, res) => {
  const data = await teams.listTeams(req.user);
  return sendSuccess(res, { data: { teams: data } });
});

// create team
export const createTeam = asyncHandler(async (req, res) => {
  const team = await teams.createTeam(req.user, req.body);
  return sendSuccess(res, { status: 201, data: { team } });
});

// get team
export const getTeam = asyncHandler(async (req, res) => {
  const team = await teams.getTeam(req.params.teamId, req.user);
  return sendSuccess(res, { data: { team } });
});

// update team
export const updateTeam = asyncHandler(async (req, res) => {
  const team = await teams.updateTeam(req.params.teamId, req.user, req.body);
  return sendSuccess(res, { data: { team } });
});

// delete team
export const deleteTeam = asyncHandler(async (req, res) => {
  await teams.deleteTeam(req.params.teamId, req.user);
  res.status(204).send();
});

// add member
export const addMember = asyncHandler(async (req, res) => {
  const team = await teams.addMember(req.params.teamId, req.user, req.body);
  return sendSuccess(res, { data: { team } });
});

// update member role
export const updateMemberRole = asyncHandler(async (req, res) => {
  const team = await teams.updateMemberRole(
    req.params.teamId,
    req.params.userId,
    req.user,
    req.body.role
  );
  return sendSuccess(res, { data: { team } });
});

// update member rank
export const updateMemberRank = asyncHandler(async (req, res) => {
  const team = await teams.updateMemberRank(
    req.params.teamId,
    req.params.userId,
    req.user,
    req.body.rankId ?? null
  );
  return sendSuccess(res, { data: { team } });
});

// remove member
export const removeMember = asyncHandler(async (req, res) => {
  await teams.removeMember(req.params.teamId, req.params.userId, req.user);
  res.status(204).send();
});

// leave team
export const leaveTeam = asyncHandler(async (req, res) => {
  await teams.leaveTeam(req.params.teamId, req.user);
  res.status(204).send();
});

// list ranks
export const listRanks = asyncHandler(async (req, res) => {
  const ranks = await teams.listRanks(req.params.teamId, req.user);
  return sendSuccess(res, { data: { ranks } });
});

// create rank
export const createRank = asyncHandler(async (req, res) => {
  const rank = await teams.createRank(req.params.teamId, req.user, req.body);
  return sendSuccess(res, { status: 201, data: { rank } });
});

// update rank
export const updateRank = asyncHandler(async (req, res) => {
  const rank = await teams.updateRank(
    req.params.teamId,
    req.params.rankId,
    req.user,
    req.body
  );
  return sendSuccess(res, { data: { rank } });
});

// delete rank
export const deleteRank = asyncHandler(async (req, res) => {
  await teams.deleteRank(req.params.teamId, req.params.rankId, req.user);
  res.status(204).send();
});

// list invitations
export const listInvitations = asyncHandler(async (req, res) => {
  const invitations = await teams.listInvitations(req.params.teamId, req.user);
  return sendSuccess(res, { data: { invitations } });
});

// remove pending invitation
export const revokeInvitation = asyncHandler(async (req, res) => {
  const team = await teams.revokeInvitation(
    req.params.teamId,
    req.params.invitationId,
    req.user
  );
  return sendSuccess(res, { data: { team } });
});