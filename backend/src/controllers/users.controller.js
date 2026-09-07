import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';
import * as users from '../services/user.service.js';

// create user
export const createUser = asyncHandler(async (req, res) => {
  const user = await users.createUser(req.body);
  sendSuccess(res, { status: 201, data: { user } });
});

// list users
export const listUsers = asyncHandler(async (req, res) => {
  const { users: data, pagination } = await users.listUsers(req.query);
  sendSuccess(res, { data: { users: data }, meta: { pagination } });
});

// get user
export const getUser = asyncHandler(async (req, res) => {
  const user = await users.getUser(req.params.userId);
  return sendSuccess(res, { data: { user } });
});

// update user
export const updateUser = asyncHandler(async (req, res) => {
  const user = await users.updateUser(req.params.userId, req.body, req.user);
  return sendSuccess(res, { data: { user } });
});

// delete user
export const deleteUser = asyncHandler(async (req, res) => {
  await users.deleteUser(req.params.userId, req.user);
  res.status(204).send();
});