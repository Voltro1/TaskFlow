import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';
import * as users from '../services/user.service.js';

export const createUser = asyncHandler(async (req, res) => {
  const user = await users.createUser(req.body);
  sendSuccess(res, { status: 201, data: { user } });
});
export const listUsers = asyncHandler(async (req, res) => {
  const { users: data, pagination } = await users.listUsers(req.query);
  sendSuccess(res, { data: { users: data }, meta: { pagination } });
});
export const getUser = asyncHandler(async (req, res) => sendSuccess(res, { data: { user: await users.getUser(req.params.userId) } }));
export const updateUser = asyncHandler(async (req, res) => sendSuccess(res, { data: { user: await users.updateUser(req.params.userId, req.body, req.user) } }));
export const deleteUser = asyncHandler(async (req, res) => { await users.deleteUser(req.params.userId, req.user); res.status(204).send(); });
