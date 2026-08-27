import * as tasks from '../services/task.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';

export const listTasks = asyncHandler(async (req, res) => { const { tasks: data, pagination } = await tasks.listTasks(req.params.projectId, req.user, req.query); sendSuccess(res, { data: { tasks: data }, meta: { pagination } }); });
export const createTask = asyncHandler(async (req, res) => sendSuccess(res, { status: 201, data: { task: await tasks.createTask(req.params.projectId, req.user, req.body) } }));
export const listPersonalTasks = asyncHandler(async (req, res) => { const { tasks: data, pagination } = await tasks.listPersonalTasks(req.user, req.query); sendSuccess(res, { data: { tasks: data }, meta: { pagination } }); });
export const createPersonalTask = asyncHandler(async (req, res) => sendSuccess(res, { status: 201, data: { task: await tasks.createPersonalTask(req.user, req.body) } }));
export const getTask = asyncHandler(async (req, res) => sendSuccess(res, { data: { task: await tasks.getTask(req.params.taskId, req.user) } }));
export const updateTask = asyncHandler(async (req, res) => sendSuccess(res, { data: { task: await tasks.updateTask(req.params.taskId, req.user, req.body) } }));
export const claimTask = asyncHandler(async (req, res) => sendSuccess(res, { data: { task: await tasks.claimTask(req.params.taskId, req.user) } }));
export const deleteTask = asyncHandler(async (req, res) => { await tasks.deleteTask(req.params.taskId, req.user); res.status(204).send(); });
