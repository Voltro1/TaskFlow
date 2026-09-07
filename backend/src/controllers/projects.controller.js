import * as projects from '../services/project.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';

// list projects
export const listProjects = asyncHandler(async (req, res) => {
  const { projects: data, pagination } = await projects.listProjects(
    req.user,
    req.query
  );
  sendSuccess(res, { data: { projects: data }, meta: { pagination } });
});

// create project
export const createProject = asyncHandler(async (req, res) => {
  const project = await projects.createProject(req.user, req.body);
  return sendSuccess(res, { status: 201, data: { project } });
});

// get project
export const getProject = asyncHandler(async (req, res) => {
  const project = await projects.getProject(req.params.projectId, req.user);
  return sendSuccess(res, { data: { project } });
});

// update project
export const updateProject = asyncHandler(async (req, res) => {
  const project = await projects.updateProject(
    req.params.projectId,
    req.user,
    req.body
  );
  return sendSuccess(res, { data: { project } });
});

// delete project
export const deleteProject = asyncHandler(async (req, res) => {
  await projects.deleteProject(req.params.projectId, req.user);
  res.status(204).send();
});

// add member
export const addMember = asyncHandler(async (req, res) => {
  const project = await projects.addMember(
    req.params.projectId,
    req.user,
    req.body
  );
  return sendSuccess(res, { data: { project } });
});

// remove member
export const removeMember = asyncHandler(async (req, res) => {
  await projects.removeMember(req.params.projectId, req.params.userId, req.user);
  res.status(204).send();
});