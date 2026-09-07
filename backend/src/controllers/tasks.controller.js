import * as tasks from '../services/task.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';

// list tasks
export const listTasks = asyncHandler(async (req, res) => {
  const { tasks: data, pagination } = await tasks.listTasks(
    req.params.projectId,
    req.user,
    req.query
  );
  sendSuccess(res, { data: { tasks: data }, meta: { pagination } });
});

// create task
export const createTask = asyncHandler(async (req, res) => {
  const task = await tasks.createTask(req.params.projectId, req.user, req.body);
  return sendSuccess(res, { status: 201, data: { task } });
});

// list personal tasks
export const listPersonalTasks = asyncHandler(async (req, res) => {
  const { tasks: data, pagination } = await tasks.listPersonalTasks(
    req.user,
    req.query
  );
  sendSuccess(res, { data: { tasks: data }, meta: { pagination } });
});

// create personal task
export const createPersonalTask = asyncHandler(async (req, res) => {
  const task = await tasks.createPersonalTask(req.user, req.body);
  return sendSuccess(res, { status: 201, data: { task } });
});

// get task
export const getTask = asyncHandler(async (req, res) => {
  const task = await tasks.getTask(req.params.taskId, req.user);
  return sendSuccess(res, { data: { task } });
});

// update task
export const updateTask = asyncHandler(async (req, res) => {
  const task = await tasks.updateTask(req.params.taskId, req.user, req.body);
  return sendSuccess(res, { data: { task } });
});

// claim task
export const claimTask = asyncHandler(async (req, res) => {
  const task = await tasks.claimTask(req.params.taskId, req.user);
  return sendSuccess(res, { data: { task } });
});

// delete task
export const deleteTask = asyncHandler(async (req, res) => {
  await tasks.deleteTask(req.params.taskId, req.user);
  res.status(204).send();
});