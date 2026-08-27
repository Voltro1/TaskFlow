import { asyncHandler } from '../utils/async-handler.js';
import { signToken } from '../utils/token.js';
import { sendSuccess } from '../utils/response.js';
import { authenticateUser, createUser } from '../services/user.service.js';

export const register = asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  const token = signToken(user);
  sendSuccess(res, { status: 201, data: { user, token, tokenType: 'Bearer' } });
});

export const login = asyncHandler(async (req, res) => {
  const user = await authenticateUser(req.body.email, req.body.password);
  const token = signToken(user);
  sendSuccess(res, { data: { user, token, tokenType: 'Bearer' } });
});

export function getCurrentUser(req, res) {
  sendSuccess(res, { data: { user: req.user } });
}
