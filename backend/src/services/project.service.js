import { query, withTransaction } from '../config/database.js';
import { mapProjectRow } from '../models/Project.js';
import { mapUserRow } from '../models/User.js';
import { AppError } from '../utils/app-error.js';
import { getProjectAccess } from '../utils/project-access.js';
import { requireProjectCapability } from '../utils/project-permissions.js';
import { normalizePaging } from '../utils/pagination.js';

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

async function loadUsersByIds(ids) {
  if (ids.length === 0) return new Map();
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await query(`${USER_COLUMNS} WHERE id IN (${placeholders})`, ids);
  return new Map(rows.map((row) => [row.id, mapUserRow(row)]));
}

async function loadProjectMembersByProjectIds(projectIds) {
  if (projectIds.length === 0) return new Map();
  const placeholders = projectIds.map(() => '?').join(', ');
  const rows = await query(
    `
      SELECT
        pm.project_id AS projectId,
        pm.role AS membershipRole,
        u.id,
        u.name,
        u.username,
        u.email,
        u.role,
        u.is_active AS isActive,
        u.profile_image_data AS profileImageData,
        u.created_at AS createdAt
      FROM project_members pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id IN (${placeholders})
        AND pm.user_id <> (
          SELECT p2.owner_id
          FROM projects p2
          WHERE p2.id = pm.project_id
        )
      ORDER BY pm.project_id, FIELD(pm.role, 'owner', 'admin', 'member'), u.name
    `,
    projectIds
  );

  const membersByProject = new Map();
  for (const row of rows) {
    const members = membersByProject.get(row.projectId) || [];
    members.push({ user: mapUserRow(row), role: row.membershipRole });
    membersByProject.set(row.projectId, members);
  }
  return membersByProject;
}

async function hydrateProjects(projectRows) {
  if (projectRows.length === 0) return [];
  const ownerIds = [...new Set(projectRows.map((project) => project.ownerId))];
  const projectIds = projectRows.map((project) => project.id);
  const [owners, membersByProject] = await Promise.all([
    loadUsersByIds(ownerIds),
    loadProjectMembersByProjectIds(projectIds)
  ]);

  return projectRows.map((project) => ({
    ...mapProjectRow(project),
    owner: owners.get(project.ownerId) || null,
    members: membersByProject.get(project.id) || []
  }));
}

export async function listProjects(user, { archived, search, page = 1, limit = 25 }) {
  const paging = normalizePaging({ page, limit });
  const conditions = [];
  const params = [];
  let joins = '';

  joins = 'INNER JOIN project_members pm_user ON pm_user.project_id = p.id AND pm_user.user_id = ?';
  params.push(user.id);

  if (archived !== undefined) {
    conditions.push('p.archived = ?');
    params.push(archived ? 1 : 0);
  }

  if (search) {
    conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.owner_id AS ownerId,
        p.archived,
        p.color,
        p.image_data AS imageData,
        p.created_at AS createdAt
      FROM projects p
      ${joins}
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ${paging.limit} OFFSET ${paging.offset}
    `,
    params
  );

  const countRows = await query(
    `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM projects p
      ${joins}
      ${where}
    `,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  return {
    projects: await hydrateProjects(rows),
    pagination: {
      page: paging.page,
      limit: paging.limit,
      total,
      pages: Math.ceil(total / paging.limit)
    }
  };
}

export async function createProject(user, values) {
  const projectId = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `
        INSERT INTO projects (name, description, owner_id, archived, color, image_data)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        values.name.trim(),
        values.description?.trim() || '',
        user.id,
        values.archived ? 1 : 0,
        values.color || '#5b5fef',
        values.imageData ?? null
      ]
    );

    await connection.execute(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [result.insertId, user.id, 'owner']
    );
    return result.insertId;
  });

  return getProject(projectId, user);
}

export async function getProject(projectId, user) {
  const { project } = await getProjectAccess(projectId, user);
  const hydrated = await hydrateProjects([project]);
  return hydrated[0];
}

export async function updateProject(projectId, user, values) {
  const { project, role } = await getProjectAccess(projectId, user);
  requireProjectCapability(role, 'edit_project');

  const assignments = [];
  const params = [];

  if (values.name !== undefined) {
    assignments.push('name = ?');
    params.push(String(values.name).trim());
  }
  if (values.description !== undefined) {
    assignments.push('description = ?');
    params.push(String(values.description).trim());
  }
  if (values.archived !== undefined) {
    assignments.push('archived = ?');
    params.push(values.archived ? 1 : 0);
  }
  if (values.color !== undefined) {
    assignments.push('color = ?');
    params.push(values.color);
  }
  if (values.imageData !== undefined) {
    assignments.push('image_data = ?');
    params.push(values.imageData);
  }

  if (assignments.length > 0) {
    await query(`UPDATE projects SET ${assignments.join(', ')} WHERE id = ?`, [...params, project.id]);
  }

  return getProject(projectId, user);
}

export async function deleteProject(projectId, user) {
  const { project, role } = await getProjectAccess(projectId, user);
  requireProjectCapability(role, 'delete_project');

  await withTransaction(async (connection) => {
    await connection.execute('DELETE FROM tasks WHERE project_id = ?', [project.id]);
    await connection.execute('DELETE FROM project_members WHERE project_id = ?', [project.id]);
    await connection.execute('DELETE FROM projects WHERE id = ?', [project.id]);
  });
}

export async function addMember(projectId, actor, { email, role }) {
  const { project, role: actorRole } = await getProjectAccess(projectId, actor);
  requireProjectCapability(actorRole, 'manage_members');
  if (role === 'owner') throw new AppError('Project owners are managed automatically', 400);
  if (role === 'admin') requireProjectCapability(actorRole, 'manage_admins');

  const users = await query(
    `
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
      WHERE email = ? AND is_active = 1
      LIMIT 1
    `,
    [email.toLowerCase().trim()]
  );

  const user = mapUserRow(users[0]);
  if (!user) throw new AppError('User not found', 404);
  if (user.id === project.ownerId) throw new AppError('The owner is already part of this project', 400);

  await withTransaction(async (connection) => {
    const [existing] = await connection.execute(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1',
      [project.id, user.id]
    );

    if (existing.length > 0) {
      if (existing[0].role === 'owner') throw new AppError('The owner cannot be reassigned', 400);
      await connection.execute(
        'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?',
        [role, project.id, user.id]
      );
      return;
    }

    await connection.execute(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [project.id, user.id, role]
    );
  });

  return getProject(projectId, actor);
}

export async function removeMember(projectId, userId, actor) {
  const { project, role } = await getProjectAccess(projectId, actor);
  requireProjectCapability(role, 'manage_members');
  if (Number(actor.id) === Number(userId)) throw new AppError('Admins cannot remove themselves from a project', 400);
  if (project.ownerId === userId) throw new AppError('The owner cannot be removed', 400);

  await query('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [project.id, userId]);
}
