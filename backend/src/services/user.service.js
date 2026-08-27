import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { mapUserAuthRow, mapUserRow } from '../models/User.js';
import { AppError } from '../utils/app-error.js';
import { normalizePaging } from '../utils/pagination.js';

const PLATFORM_ADMIN_EMAIL = 'voltro.oc@gmail.com';

function normalizeEmail(email) {
  const normalized = String(email ?? '').toLowerCase().trim();
  const [localPart, domain] = normalized.split('@');
  if (!localPart || !domain) return normalized;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${localPart.split('+')[0].replace(/\./g, '')}@gmail.com`;
  }
  return normalized;
}

function isPlatformAdminEmail(email) {
  return normalizeEmail(email) === normalizeEmail(PLATFORM_ADMIN_EMAIL);
}

function assertNotProtectedManager(targetUser, actor) {
  if (!targetUser || !isPlatformAdminEmail(targetUser.email)) return;
  if (Number(targetUser.id) === Number(actor?.id)) return;
  throw new AppError('This manager account is protected and cannot be modified by admins', 403);
}

const USER_COLUMNS = `
  SELECT
    id,
    name,
    username,
    email,
    role,
    is_active AS isActive,
    profile_image_data AS profileImageData,
    created_at AS createdAt
  FROM users
`;

const USER_AUTH_COLUMNS = `
  SELECT
    id,
    name,
    username,
    email,
    password_hash AS passwordHash,
    role,
    is_active AS isActive,
    profile_image_data AS profileImageData,
    created_at AS createdAt
  FROM users
`;

async function getUserAuthByEmail(email) {
  const normalizedEmail = String(email).toLowerCase().trim();
  if (isPlatformAdminEmail(normalizedEmail)) {
    const candidates = await query(`${USER_AUTH_COLUMNS} WHERE email LIKE ?`, ['%@gmail.com']);
    const match = candidates.find((row) => normalizeEmail(row.email) === normalizeEmail(normalizedEmail));
    if (match && match.role !== 'admin') {
      await query("UPDATE users SET role = 'admin' WHERE id = ?", [match.id]);
      match.role = 'admin';
    }
    if (match) return mapUserAuthRow(match);
    await query("UPDATE users SET role = 'admin' WHERE email = ?", [normalizedEmail]);
  }
  const rows = await query(`${USER_AUTH_COLUMNS} WHERE email = ? LIMIT 1`, [normalizedEmail]);
  return mapUserAuthRow(rows[0]);
}

async function getUserRecordById(userId) {
  const rows = await query(`${USER_COLUMNS} WHERE id = ? LIMIT 1`, [userId]);
  const row = rows[0];
  if (row && isPlatformAdminEmail(row.email) && row.role !== 'admin') {
    await query("UPDATE users SET role = 'admin' WHERE id = ?", [userId]);
    row.role = 'admin';
  }
  return mapUserRow(row);
}

export async function findUserById(userId) {
  return getUserRecordById(userId);
}

export async function listUsers({ page = 1, limit = 25, search, role, isActive } = {}) {
  const paging = normalizePaging({ page, limit });
  const filters = [];
  const params = [];

  if (search) {
    filters.push('(name LIKE ? OR username LIKE ? OR email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (role) {
    filters.push('role = ?');
    params.push(role);
  }
  if (isActive !== undefined) {
    filters.push('is_active = ?');
    params.push(isActive ? 1 : 0);
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows, totalRows] = await Promise.all([
    query(`${USER_COLUMNS} ${where} ORDER BY created_at DESC LIMIT ${paging.limit} OFFSET ${paging.offset}`, [...params]),
    query(`SELECT COUNT(*) AS total FROM users ${where}`, [...params])
  ]);

  const total = Number(totalRows[0]?.total || 0);
  return {
    users: rows.map(mapUserRow),
    pagination: {
      page: paging.page,
      limit: paging.limit,
      total,
      pages: Math.ceil(total / paging.limit)
    }
  };
}

export async function getUser(userId) {
  const user = await getUserRecordById(userId);
  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function createUser({ name, username, email, password, role = 'user', isActive = true }) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const normalizedUsername = String(username || name).trim().toLowerCase();
  const effectiveRole = isPlatformAdminEmail(normalizedEmail) ? 'admin' : role;
  const existing = await query('SELECT id, email FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
  if (existing.length > 0) throw new AppError('Email is already registered', 409);
  if (normalizedEmail.endsWith('@gmail.com') || normalizedEmail.endsWith('@googlemail.com')) {
    const gmailExisting = await query('SELECT id, email FROM users WHERE email LIKE ?', ['%@gmail.com']);
    if (gmailExisting.some((user) => normalizeEmail(user.email) === normalizeEmail(normalizedEmail))) {
      throw new AppError('Email is already registered', 409);
    }
  }
  const existingUsername = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [normalizedUsername]);
  if (existingUsername.length > 0) throw new AppError('Username is already registered', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `
      INSERT INTO users (name, username, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [name.trim(), normalizedUsername, normalizedEmail, passwordHash, effectiveRole, isActive ? 1 : 0]
  );

  return getUser(result.insertId);
}

async function assertUniqueIdentity({ email, username }, userId) {
  if (email !== undefined) {
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [normalizedEmail, userId]);
    if (existing.length > 0) throw new AppError('Email is already registered', 409);
    if (normalizedEmail.endsWith('@gmail.com') || normalizedEmail.endsWith('@googlemail.com')) {
      const gmailExisting = await query('SELECT id, email FROM users WHERE id <> ? AND email LIKE ?', [userId, '%@gmail.com']);
      if (gmailExisting.some((user) => normalizeEmail(user.email) === normalizeEmail(normalizedEmail))) {
        throw new AppError('Email is already registered', 409);
      }
    }
  }
  if (username !== undefined) {
    const normalizedUsername = String(username).trim().toLowerCase();
    const existing = await query('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1', [normalizedUsername, userId]);
    if (existing.length > 0) throw new AppError('Username is already registered', 409);
  }
}

export async function authenticateUser(email, password) {
  const user = await getUserAuthByEmail(String(email).toLowerCase().trim());
  if (!user || !user.isActive) throw new AppError('Invalid email or password', 401);
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw new AppError('Invalid email or password', 401);
  return getUser(user.id);
}

export async function updateUser(userId, changes, actor) {
  const current = await getUser(userId);
  assertNotProtectedManager(current, actor);
  if (current.id === actor.id && changes.isActive === false) throw new AppError('You cannot deactivate your own account', 400);
  if (current.id === actor.id && changes.role === 'user' && current.role === 'admin') {
    throw new AppError('You cannot remove your own admin role', 400);
  }
  await assertUniqueIdentity(changes, userId);

  const assignments = [];
  const params = [];

  if (changes.name !== undefined && current.id === actor.id) {
    assignments.push('name = ?');
    params.push(String(changes.name).trim());
  }
  if (changes.email !== undefined && current.id === actor.id) {
    assignments.push('email = ?');
    params.push(String(changes.email).toLowerCase().trim());
  }
  if (changes.username !== undefined) {
    assignments.push('username = ?');
    params.push(String(changes.username).trim().toLowerCase());
  }
  if (changes.role !== undefined) {
    assignments.push('role = ?');
    params.push(changes.role);
  }
  if (changes.isActive !== undefined) {
    assignments.push('is_active = ?');
    params.push(changes.isActive ? 1 : 0);
  }
  if (changes.password !== undefined) {
    assignments.push('password_hash = ?');
    params.push(await bcrypt.hash(changes.password, 12));
  }
  if (changes.profileImageData !== undefined) {
    assignments.push('profile_image_data = ?');
    params.push(changes.profileImageData);
  }
  if (assignments.length > 0) {
    await query(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`, [...params, userId]);
  }

  return getUser(userId);
}

export async function changePassword(userId, currentPassword, newPassword) {
  const rows = await query(`${USER_AUTH_COLUMNS} WHERE id = ? LIMIT 1`, [userId]);
  const user = mapUserAuthRow(rows[0]);
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError('Current password is incorrect', 401);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(newPassword, 12), userId]);
}

export async function deactivateOwnAccount(userId, password) {
  const rows = await query(`${USER_AUTH_COLUMNS} WHERE id = ? LIMIT 1`, [userId]);
  const user = mapUserAuthRow(rows[0]);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError('Password confirmation is incorrect', 401);
  const owned = await query('SELECT COUNT(*) AS total FROM projects WHERE owner_id = ?', [userId]);
  if (Number(owned[0]?.total || 0)) throw new AppError('Transfer or delete owned projects before deleting your account', 409);
  await query('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
}

export async function updateOwnProfile(userId, changes) {
  return updateUser(userId, changes, { id: userId, role: 'user' });
}

export async function deleteUser(userId, actor) {
  const current = await getUser(userId);
  assertNotProtectedManager(current, actor);
  if (current.id === actor.id) throw new AppError('You cannot delete your own account', 400);

  const ownedProjects = await query('SELECT COUNT(*) AS total FROM projects WHERE owner_id = ?', [userId]);
  if (Number(ownedProjects[0]?.total || 0) > 0) {
    throw new AppError('Transfer or delete owned projects before deleting this user', 409);
  }

  await query('DELETE FROM users WHERE id = ?', [userId]);
}
