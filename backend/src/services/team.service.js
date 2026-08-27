import { query, withTransaction } from '../config/database.js';
import { AppError } from '../utils/app-error.js';
import { mapUserRow } from '../models/User.js';

const selectTeam = `
  SELECT t.id, t.name, t.description, t.owner_id AS ownerId
  FROM teams t`;
const selectUsers = `
  SELECT id, name, username, email, role, is_active AS isActive, created_at AS createdAt
  FROM users`;
const selectRanks = `
  SELECT id, team_id AS teamId, name, color, created_at AS createdAt
  FROM team_ranks`;
const selectInvitations = `
  SELECT
    ti.id,
    ti.team_id AS teamId,
    ti.email,
    ti.role,
    ti.invited_by_id AS invitedById,
    u.name AS invitedByName,
    u.email AS invitedByEmail,
    ti.status,
    ti.created_at AS createdAt
  FROM team_invitations ti
  LEFT JOIN users u ON u.id = ti.invited_by_id`;

async function access(teamId, user) {
  const rows = await query(
    `${selectTeam}
     LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = ?
     WHERE t.id = ? LIMIT 1`,
    [user.id, teamId]
  );
  const team = rows[0];
  if (!team) throw new AppError('Team not found', 404);
  const memberships = await query('SELECT role FROM team_members WHERE team_id = ? AND user_id = ? LIMIT 1', [teamId, user.id]);
  if (!memberships[0]) throw new AppError('You do not have access to this team', 403);
  return { team, role: memberships[0].role };
}

function requireAdmin(role) {
  if (!['owner', 'admin'].includes(role)) throw new AppError('Team administration access required', 403);
}

async function countLeadership(teamId, excludeUserId = null) {
  const conditions = ['team_id = ?'];
  const params = [teamId];
  if (excludeUserId !== null) {
    conditions.push('user_id <> ?');
    params.push(excludeUserId);
  }
  const rows = await query(
    `SELECT COUNT(*) AS total FROM team_members WHERE ${conditions.join(' AND ')} AND role IN ('owner', 'admin')`,
    params
  );
  return Number(rows[0]?.total ?? 0);
}

async function hydrate(team) {
  const [members, ranks, invitations] = await Promise.all([
    query(
      `
        SELECT
          u.id,
          u.name,
          u.username,
          u.email,
          u.role,
          u.is_active AS isActive,
          u.created_at AS createdAt,
          tm.role AS membershipRole,
          tm.rank_id AS rankId,
          r.name AS rankName,
          r.color AS rankColor
        FROM users u
        INNER JOIN team_members tm ON tm.user_id = u.id
        LEFT JOIN team_ranks r ON r.id = tm.rank_id
        WHERE tm.team_id = ?
        ORDER BY FIELD(tm.role, 'owner', 'admin', 'member'), u.name
      `,
      [team.id]
    ),
    query(`${selectRanks} WHERE team_id = ? ORDER BY created_at ASC`, [team.id]),
    query(`${selectInvitations} WHERE ti.team_id = ? AND ti.status = 'pending' ORDER BY ti.created_at DESC`, [team.id])
  ]);

  return {
    ...team,
    ranks: ranks.map((rank) => ({ id: rank.id, name: rank.name, color: rank.color, createdAt: rank.createdAt })),
    invitations: invitations.map((invite) => ({
      id: invite.id,
      teamId: invite.teamId,
      email: invite.email,
      role: invite.role,
      invitedById: invite.invitedById,
      invitedByName: invite.invitedByName,
      invitedByEmail: invite.invitedByEmail,
      status: invite.status,
      createdAt: invite.createdAt
    })),
    members: members.map((row) => ({
      user: mapUserRow(row),
      role: row.membershipRole,
      rankId: row.rankId ?? null,
      rank: row.rankId ? { id: row.rankId, name: row.rankName, color: row.rankColor } : null
    }))
  };
}

export async function listTeams(user) {
  const rows = await query(`${selectTeam} INNER JOIN team_members tm ON tm.team_id = t.id WHERE tm.user_id = ? ORDER BY t.name ASC`, [user.id]);
  return Promise.all(rows.map(hydrate));
}

export async function createTeam(user, values) {
  const id = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      'INSERT INTO teams (name, description, owner_id) VALUES (?, ?, ?)',
      [values.name.trim(), values.description?.trim() || '', user.id]
    );
    await connection.execute(
      "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'owner')",
      [result.insertId, user.id]
    );
    return result.insertId;
  });
  return getTeam(id, user);
}

export async function getTeam(teamId, user) {
  const { team } = await access(teamId, user);
  return hydrate(team);
}

export async function updateTeam(teamId, user, values) {
  const { role } = await access(teamId, user);
  requireAdmin(role);
  const fields = [];
  const params = [];
  if (values.name !== undefined) { fields.push('name = ?'); params.push(values.name.trim()); }
  if (values.description !== undefined) { fields.push('description = ?'); params.push(values.description.trim()); }
  if (fields.length) {
    await query(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`, [...params, teamId]);
  }
  return getTeam(teamId, user);
}

async function resolveMemberTarget(teamId, { userId, email }) {
  if (userId) {
    const rows = await query(`${selectUsers} WHERE id = ? LIMIT 1`, [userId]);
    return rows[0] ? mapUserRow(rows[0]) : null;
  }
  if (email) {
    const rows = await query(`${selectUsers} WHERE email = ? LIMIT 1`, [email.toLowerCase().trim()]);
    return rows[0] ? mapUserRow(rows[0]) : null;
  }
  throw new AppError('User selection is required', 422);
}

async function ensureUniqueInvite(teamId, email) {
  const rows = await query(
    'SELECT id FROM team_invitations WHERE team_id = ? AND email = ? AND status = ? LIMIT 1',
    [teamId, email.toLowerCase().trim(), 'pending']
  );
  if (rows[0]) throw new AppError('A pending invitation already exists for this email', 409);
}

async function ensureNotMember(teamId, userId) {
  const rows = await query('SELECT role FROM team_members WHERE team_id = ? AND user_id = ? LIMIT 1', [teamId, userId]);
  if (rows[0]) throw new AppError('User is already a member of this team', 409);
}

async function ensureNotInvited(teamId, email) {
  await ensureUniqueInvite(teamId, email);
}

export async function addMember(teamId, actor, values) {
  const { role: actorRole } = await access(teamId, actor);
  requireAdmin(actorRole);

  const target = await resolveMemberTarget(teamId, values);
  const email = (values.email ?? target?.email ?? '').toLowerCase().trim();
  if (!email) throw new AppError('Email is required', 422);
  if (target && Number(target.id) === Number(actor.id)) {
    throw new AppError('You cannot invite yourself', 400);
  }

  if (target) {
    await ensureNotMember(teamId, target.id);
    await ensureNotInvited(teamId, target.email);
    if (values.rankId) {
      const ranks = await query('SELECT id FROM team_ranks WHERE id = ? AND team_id = ? LIMIT 1', [values.rankId, teamId]);
      if (!ranks[0]) throw new AppError('Rank not found for this team', 404);
    }
    await query(
      'INSERT INTO team_members (team_id, user_id, role, rank_id) VALUES (?, ?, ?, ?)',
      [teamId, target.id, values.role || 'member', values.rankId ?? null]
    );
    return getTeam(teamId, actor);
  }

  await ensureNotInvited(teamId, email);
  await query(
    'INSERT INTO team_invitations (team_id, email, role, invited_by_id, status) VALUES (?, ?, ?, ?, ?)',
    [teamId, email, values.role || 'member', actor.id, 'pending']
  );
  return getTeam(teamId, actor);
}

export async function listInvitations(teamId, user) {
  const { role } = await access(teamId, user);
  requireAdmin(role);
  return query(`${selectInvitations} WHERE ti.team_id = ? AND ti.status = 'pending' ORDER BY ti.created_at DESC`, [teamId]);
}

export async function updateMemberRole(teamId, userId, actor, role) {
  const { role: actorRole } = await access(teamId, actor);
  requireAdmin(actorRole);

  const members = await query('SELECT role FROM team_members WHERE team_id = ? AND user_id = ? LIMIT 1', [teamId, userId]);
  if (!members[0]) throw new AppError('Member not found', 404);
  if (members[0].role === 'owner') throw new AppError('The team owner role cannot be changed', 400);
  if (!['admin', 'member'].includes(role)) throw new AppError('Invalid member role', 422);

  const leadershipCount = await countLeadership(teamId, userId);
  if (members[0].role === 'admin' && role === 'member' && leadershipCount === 0) {
    throw new AppError('A team must keep at least one administrator', 400);
  }

  await query('UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?', [role, teamId, userId]);
  return getTeam(teamId, actor);
}

export async function updateMemberRank(teamId, userId, actor, rankId) {
  const { role } = await access(teamId, actor);
  requireAdmin(role);

  const members = await query('SELECT role FROM team_members WHERE team_id = ? AND user_id = ? LIMIT 1', [teamId, userId]);
  if (!members[0]) throw new AppError('Member not found', 404);
  if (members[0].role === 'owner') throw new AppError('The team owner rank cannot be changed', 400);

  if (rankId !== null) {
    const ranks = await query('SELECT id FROM team_ranks WHERE id = ? AND team_id = ? LIMIT 1', [rankId, teamId]);
    if (!ranks[0]) throw new AppError('Rank not found for this team', 404);
  }

  await query('UPDATE team_members SET rank_id = ? WHERE team_id = ? AND user_id = ?', [rankId, teamId, userId]);
  return getTeam(teamId, actor);
}

export async function removeMember(teamId, userId, actor) {
  const { team, role } = await access(teamId, actor);
  requireAdmin(role);
  if (Number(actor.id) === Number(userId)) throw new AppError('Admins cannot remove themselves from a team', 400);

  const members = await query('SELECT role FROM team_members WHERE team_id = ? AND user_id = ? LIMIT 1', [teamId, userId]);
  if (!members[0]) throw new AppError('Member not found', 404);
  if (members[0].role === 'owner') throw new AppError('The team owner cannot be removed', 400);

  const leadershipCount = await countLeadership(teamId, userId);
  if (members[0].role === 'admin' && leadershipCount === 0) {
    throw new AppError('A team must keep at least one administrator', 400);
  }

  await query('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [teamId, userId]);
  return hydrate(team);
}

export async function revokeInvitation(teamId, invitationId, actor) {
  const { role } = await access(teamId, actor);
  requireAdmin(role);
  const rows = await query('SELECT id FROM team_invitations WHERE id = ? AND team_id = ? AND status = ? LIMIT 1', [invitationId, teamId, 'pending']);
  if (!rows[0]) throw new AppError('Invitation not found', 404);
  await query('DELETE FROM team_invitations WHERE id = ? AND team_id = ?', [invitationId, teamId]);
  return getTeam(teamId, actor);
}

export async function leaveTeam(teamId, user) {
  const { team } = await access(teamId, user);
  if (Number(team.ownerId) === Number(user.id)) throw new AppError('Transfer ownership or delete the team before leaving', 409);
  const members = await query('SELECT role FROM team_members WHERE team_id = ? AND user_id = ? LIMIT 1', [teamId, user.id]);
  if (!members[0]) throw new AppError('You are not a member of this team', 404);
  if (members[0].role === 'admin') {
    const leadershipCount = await countLeadership(teamId, user.id);
    if (leadershipCount === 0) throw new AppError('A team must keep at least one administrator', 400);
  }
  await query('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [teamId, user.id]);
}

export async function deleteTeam(teamId, user) {
  const { team, role } = await access(teamId, user);
  if (role !== 'owner') throw new AppError('Only the team owner can delete a team', 403);
  await query('DELETE FROM teams WHERE id = ?', [teamId]);
  return team;
}

export async function listRanks(teamId, user) {
  await access(teamId, user);
  return query(`${selectRanks} WHERE team_id = ? ORDER BY created_at ASC`, [teamId]);
}

export async function createRank(teamId, user, values) {
  const { role } = await access(teamId, user);
  requireAdmin(role);
  const [existing] = await query('SELECT id FROM team_ranks WHERE team_id = ? AND name = ? LIMIT 1', [teamId, values.name.trim()]);
  if (existing) throw new AppError('Rank name already exists for this team', 409);
  return withTransaction(async (connection) => {
    const [result] = await connection.execute(
      'INSERT INTO team_ranks (team_id, name, color) VALUES (?, ?, ?)',
      [teamId, values.name.trim(), values.color || '#5b5fef']
    );
    const rows = await connection.execute(`${selectRanks} WHERE id = ? LIMIT 1`, [result.insertId]);
    return rows[0][0];
  });
}

export async function updateRank(teamId, rankId, user, values) {
  const { role } = await access(teamId, user);
  requireAdmin(role);
  const fields = [];
  const params = [];
  if (values.name !== undefined) { fields.push('name = ?'); params.push(values.name.trim()); }
  if (values.color !== undefined) { fields.push('color = ?'); params.push(values.color); }
  if (fields.length) {
    const existing = await query('SELECT id FROM team_ranks WHERE team_id = ? AND id <> ? AND name = ? LIMIT 1', [teamId, rankId, values.name?.trim()]);
    if (values.name !== undefined && existing[0]) throw new AppError('Rank name already exists for this team', 409);
    await query(`UPDATE team_ranks SET ${fields.join(', ')} WHERE id = ? AND team_id = ?`, [...params, rankId, teamId]);
  }
  return query(`${selectRanks} WHERE id = ? AND team_id = ? LIMIT 1`, [rankId, teamId]).then((rows) => rows[0]);
}

export async function deleteRank(teamId, rankId, user) {
  const { role } = await access(teamId, user);
  requireAdmin(role);
  await query('UPDATE team_members SET rank_id = NULL WHERE team_id = ? AND rank_id = ?', [teamId, rankId]);
  await query('DELETE FROM team_ranks WHERE id = ? AND team_id = ?', [rankId, teamId]);
}
