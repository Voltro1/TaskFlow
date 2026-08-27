import { query, withTransaction } from '../config/database.js';
import { mapTaskRow } from '../models/Task.js';
import { AppError } from '../utils/app-error.js';
import { getProjectAccess } from '../utils/project-access.js';
import { requireProjectCapability } from '../utils/project-permissions.js';
import { normalizePaging } from '../utils/pagination.js';

const TASK_COLUMNS = `
  SELECT
    t.id,
    t.project_id AS projectId,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.progress,
    t.due_date AS dueDate,
    t.color,
    t.notes,
    t.created_at AS createdAt,
    a.id AS assigneeId,
    a.name AS assigneeName,
    a.email AS assigneeEmail,
    a.role AS assigneeRole,
    a.is_active AS assigneeIsActive,
    a.created_at AS assigneeCreatedAt,
    c.id AS createdById,
    c.name AS createdByName,
    c.email AS createdByEmail,
    c.role AS createdByRole,
    c.is_active AS createdByIsActive,
    c.created_at AS createdByCreatedAt
  FROM tasks t
  LEFT JOIN users a ON a.id = t.assignee_id
  LEFT JOIN users c ON c.id = t.created_by_id
`;

async function assertProjectAssignee(projectId, assigneeId) {
  if (!assigneeId) return;
  const rows = await query('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1', [projectId, assigneeId]);
  if (rows.length === 0) throw new AppError('Assignee must be a project member', 422);
}

async function getTaskRecord(taskId) {
  const rows = await query(`${TASK_COLUMNS} WHERE t.id = ? LIMIT 1`, [taskId]);
  return mapTaskRow(rows[0]);
}

function buildTaskFilterWhere(baseConditions, extraConditions = []) {
  const conditions = [...baseConditions, ...extraConditions];
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

async function listTasksByConditions(conditions, params, { page = 1, limit = 25 }) {
  const paging = normalizePaging({ page, limit });
  const where = buildTaskFilterWhere(conditions);
  const offset = (paging.page - 1) * paging.limit;

  const rows = await query(
    `
      ${TASK_COLUMNS}
      ${where}
      ORDER BY t.created_at DESC
      LIMIT ${paging.limit} OFFSET ${offset}
    `,
    params
  );

  const countRows = await query(
    `
      SELECT COUNT(*) AS total
      FROM tasks t
      ${where}
    `,
    params
  );

  const total = Number(countRows[0]?.total || 0);

  return {
    tasks: rows.map(mapTaskRow),
    pagination: {
      page: paging.page,
      limit: paging.limit,
      total,
      pages: Math.ceil(total / paging.limit)
    }
  };
}

function normalizeStatus(value) {
  if (value === 'in-progress') return 'in_progress';
  if (value === 'in-review') return 'in_review';
  return value;
}

function validatePersonalAssignee(assigneeId, userId) {
  if (assigneeId === null || assigneeId === undefined) return;
  if (String(assigneeId) !== String(userId)) {
    throw new AppError('Personal tasks can only be assigned to you', 422);
  }
}

async function getPersonalTaskAccess(task, user) {
  const ownerId = task.createdBy?.id ?? null;
  if (ownerId !== user.id) throw new AppError('You do not have access to this task', 403);
}

async function getProjectTaskAccess(task, user) {
  await getProjectAccess(task.projectId, user);
}

async function getProjectTaskRole(task, user) {
  const { role } = await getProjectAccess(task.projectId, user);
  return role;
}

function hasAdministrativeTaskChanges(values) {
  return [
    'title',
    'description',
    'priority',
    'progress',
    'assignee',
    'dueDate',
    'notes',
    'projectId',
    'tags'
  ].some((field) => Object.prototype.hasOwnProperty.call(values, field));
}

function hasOnlyStatusChange(values) {
  const keys = Object.keys(values);
  return keys.length > 0 && keys.every((field) => field === 'status');
}

export async function listTasks(projectId, user, { status, priority, assignee, search, page = 1, limit = 25 }) {
  await getProjectAccess(projectId, user);

  const conditions = ['t.project_id = ?'];
  const params = [projectId];

  if (status) {
    conditions.push('t.status = ?');
    params.push(normalizeStatus(status));
  }
  if (priority) {
    conditions.push('t.priority = ?');
    params.push(priority);
  }
  if (assignee) {
    conditions.push('t.assignee_id = ?');
    params.push(assignee);
  }
  if (search) {
    conditions.push('(t.title LIKE ? OR t.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  return listTasksByConditions(conditions, params, { page, limit });
}

export async function listPersonalTasks(user, { status, priority, search, page = 1, limit = 25 }) {
  const conditions = ['t.project_id IS NULL', 't.created_by_id = ?'];
  const params = [user.id];

  if (status) {
    conditions.push('t.status = ?');
    params.push(normalizeStatus(status));
  }
  if (priority) {
    conditions.push('t.priority = ?');
    params.push(priority);
  }
  if (search) {
    conditions.push('(t.title LIKE ? OR t.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  return listTasksByConditions(conditions, params, { page, limit });
}

export async function createTask(projectId, user, values) {
  const { project, role } = await getProjectAccess(projectId, user);
  requireProjectCapability(role, 'create_task');
  if (values.assignee !== undefined && values.assignee !== null) {
    requireProjectCapability(role, 'assign_task');
  }
  await assertProjectAssignee(project.id, values.assignee);

  const taskId = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `
        INSERT INTO tasks (
          project_id,
          title,
          description,
          status,
          priority,
          progress,
          assignee_id,
          due_date,
          color,
          notes,
          created_by_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        project.id,
        values.title.trim(),
        values.description?.trim() || '',
        normalizeStatus(values.status || 'todo'),
        values.priority || 'medium',
        values.progress ?? 0,
        values.assignee ?? null,
        values.dueDate ?? null,
        null,
        values.notes?.trim() || 'No extra details',
        user.id
      ]
    );
    return result.insertId;
  });

  return getTask(taskId, user);
}

export async function createPersonalTask(user, values) {
  validatePersonalAssignee(values.assignee ?? null, user.id);
  const taskId = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `
        INSERT INTO tasks (
          project_id,
          title,
          description,
          status,
          priority,
          progress,
          assignee_id,
          due_date,
          color,
          notes,
          created_by_id
        ) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        values.title.trim(),
        values.description?.trim() || '',
        normalizeStatus(values.status || 'todo'),
        values.priority || 'medium',
        values.progress ?? 0,
        values.assignee ?? user.id,
        values.dueDate ?? null,
        values.color ?? '#5b5fef',
        values.notes?.trim() || 'No extra details',
        user.id
      ]
    );
    return result.insertId;
  });

  return getTask(taskId, user);
}

export async function getTask(taskId, user) {
  const task = await getTaskRecord(taskId);
  if (!task) throw new AppError('Task not found', 404);
  if (task.projectId) {
    await getProjectTaskAccess(task, user);
  } else {
    await getPersonalTaskAccess(task, user);
  }
  return task;
}

export async function updateTask(taskId, user, values) {
  const current = await getTask(taskId, user);

  const isPersonal = !current.projectId;
  let projectRole = null;
  if (isPersonal) {
    await getPersonalTaskAccess(current, user);
  } else {
    projectRole = await getProjectTaskRole(current, user);
    if (projectRole === 'member') {
      if (current.assignee?.id !== user.id) {
        throw new AppError('Members can only update tasks assigned to them', 403);
      }
      if (!hasOnlyStatusChange(values)) {
        throw new AppError('Members can only change the status of their assigned tasks', 403);
      }
    } else if (hasAdministrativeTaskChanges(values)) {
      requireProjectCapability(projectRole, 'edit_task');
    }
  }

  const assignments = [];
  const params = [];

  if (values.title !== undefined) {
    assignments.push('title = ?');
    params.push(String(values.title).trim());
  }
  if (values.description !== undefined) {
    assignments.push('description = ?');
    params.push(String(values.description).trim());
  }
  if (values.notes !== undefined) {
    if (!isPersonal) {
      requireProjectCapability(projectRole, 'edit_task');
    }
    assignments.push('notes = ?');
    params.push(String(values.notes).trim() || 'No extra details');
  }
  if (values.status !== undefined) {
    if (!isPersonal) {
      requireProjectCapability(projectRole, 'change_task_status');
      if (projectRole === 'member' && current.assignee?.id !== user.id) {
        throw new AppError('Members can only change the status of tasks assigned to them', 403);
      }
    }
    assignments.push('status = ?');
    params.push(normalizeStatus(values.status));
  }
  if (values.priority !== undefined) {
    if (!isPersonal) {
      requireProjectCapability(projectRole, 'change_task_priority');
    }
    assignments.push('priority = ?');
    params.push(values.priority);
  }
  if (values.progress !== undefined) {
    if (!isPersonal) {
      requireProjectCapability(projectRole, 'edit_task');
    }
    assignments.push('progress = ?');
    params.push(values.progress);
  }
  if (values.assignee !== undefined) {
    if (isPersonal) {
      validatePersonalAssignee(values.assignee, user.id);
    } else {
      const currentAssigneeId = current.assignee?.id ?? null;
      if (values.assignee !== currentAssigneeId && values.assignee !== null) {
        requireProjectCapability(projectRole, 'assign_task');
      }
      await assertProjectAssignee(current.projectId, values.assignee);
    }
    assignments.push('assignee_id = ?');
    params.push(values.assignee);
  }
  if (values.dueDate !== undefined) {
    assignments.push('due_date = ?');
    params.push(values.dueDate);
  }
  if (values.color !== undefined) {
    if (!isPersonal) {
      throw new AppError('Only personal tasks can set a custom color', 403);
    }
    assignments.push('color = ?');
    params.push(values.color);
  }

  if (assignments.length > 0) {
    await query(`UPDATE tasks SET ${assignments.join(', ')} WHERE id = ?`, [...params, taskId]);
  }

  return getTask(taskId, user);
}

export async function claimTask(taskId, user) {
  const current = await getTask(taskId, user);
  if (!current.projectId) throw new AppError('Only project tasks can be claimed', 400);

  const role = await getProjectTaskRole(current, user);
  requireProjectCapability(role, 'claim_task');

  const result = await withTransaction(async (connection) => {
    const [update] = await connection.execute(
      `
        UPDATE tasks t
        INNER JOIN project_members pm
          ON pm.project_id = t.project_id
         AND pm.user_id = ?
        SET t.assignee_id = ?
        WHERE t.id = ?
          AND t.project_id IS NOT NULL
          AND t.assignee_id IS NULL
      `,
      [user.id, user.id, taskId]
    );

    return update.affectedRows;
  });

  if (result === 0) {
    const latest = await getTask(taskId, user);
    if (latest.assignee?.id) {
      throw new AppError('Task has already been claimed', 409);
    }
    throw new AppError('Task claim failed', 409);
  }

  return getTask(taskId, user);
}

export async function deleteTask(taskId, user) {
  const current = await getTask(taskId, user);
  if (!current.projectId) {
    await getPersonalTaskAccess(current, user);
  } else {
    const { role } = await getProjectAccess(current.projectId, user);
    requireProjectCapability(role, 'delete_task');
  }
  await query('DELETE FROM tasks WHERE id = ?', [taskId]);
}
