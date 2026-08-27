import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const pool = mysql.createPool({
  host: env.mysql.host,
  port: env.mysql.port,
  user: env.mysql.user,
  password: env.mysql.password,
  database: env.mysql.database,
  waitForConnections: true,
  connectionLimit: env.mysql.connectionLimit,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: env.mysql.timezone,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function normalizeEmail(email) {
  const normalized = String(email ?? '').toLowerCase().trim();
  const [localPart, domain] = normalized.split('@');
  if (!localPart || !domain) return normalized;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${localPart.split('+')[0].replace(/\./g, '')}@gmail.com`;
  }
  return normalized;
}

export async function initializeSchema() {
  const schemaUrl = new URL('../../sql/schema.sql', import.meta.url);
  const schemaSql = await readFile(schemaUrl, 'utf8');
  const statements = splitSqlStatements(schemaSql);

  for (const statement of statements) {
    await pool.execute(statement);
  }

  const [userColumns] = await pool.execute("SHOW COLUMNS FROM users LIKE 'username'");
  if (userColumns.length === 0) {
    await pool.execute('ALTER TABLE users ADD COLUMN username VARCHAR(80) NULL AFTER name');
    await pool.execute('UPDATE users SET username = COALESCE(NULLIF(username, \'\'), name)');
    await pool.execute('ALTER TABLE users MODIFY username VARCHAR(80) NOT NULL');
    await pool.execute('ALTER TABLE users ADD UNIQUE KEY users_username_unique (username)');
  }

  const [profileImageColumns] = await pool.execute("SHOW COLUMNS FROM users LIKE 'profile_image_data'");
  if (profileImageColumns.length === 0) {
    await pool.execute('ALTER TABLE users ADD COLUMN profile_image_data LONGTEXT NULL AFTER is_active');
  }

  const [projectColorColumns] = await pool.execute("SHOW COLUMNS FROM projects LIKE 'color'");
  if (projectColorColumns.length === 0) {
    await pool.execute("ALTER TABLE projects ADD COLUMN color VARCHAR(16) NOT NULL DEFAULT '#5b5fef' AFTER archived");
  }

  const [projectImageColumns] = await pool.execute("SHOW COLUMNS FROM projects LIKE 'image_data'");
  if (projectImageColumns.length === 0) {
    await pool.execute('ALTER TABLE projects ADD COLUMN image_data LONGTEXT NULL AFTER color');
  }

  const [taskProjectColumns] = await pool.execute("SHOW COLUMNS FROM tasks LIKE 'project_id'");
  if (taskProjectColumns.length > 0) {
    await pool.execute('ALTER TABLE tasks MODIFY project_id INT NULL');
  }

  const [taskStatusColumns] = await pool.execute("SHOW COLUMNS FROM tasks LIKE 'status'");
  if (taskStatusColumns.length > 0) {
    await pool.execute("ALTER TABLE tasks MODIFY status ENUM('todo', 'in_progress', 'in_review', 'done') NOT NULL DEFAULT 'todo'");
  }

  const [taskColorColumns] = await pool.execute("SHOW COLUMNS FROM tasks LIKE 'color'");
  if (taskColorColumns.length === 0) {
    await pool.execute("ALTER TABLE tasks ADD COLUMN color VARCHAR(16) NULL AFTER due_date");
  }

  const [taskNotesColumns] = await pool.execute("SHOW COLUMNS FROM tasks LIKE 'notes'");
  if (taskNotesColumns.length === 0) {
    await pool.execute('ALTER TABLE tasks ADD COLUMN notes TEXT NULL AFTER color');
    await pool.execute("UPDATE tasks SET notes = 'No extra details' WHERE notes IS NULL");
  }

  await pool.execute("UPDATE users SET role = 'admin' WHERE email = 'voltro.oc@gmail.com'");
  const [platformAdminRows] = await pool.execute("SELECT id, email, role FROM users WHERE email LIKE '%@gmail.com' OR email LIKE '%@googlemail.com'");
  for (const row of platformAdminRows) {
    if (normalizeEmail(row.email) === normalizeEmail('voltro.oc@gmail.com') && row.role !== 'admin') {
      await pool.execute("UPDATE users SET role = 'admin' WHERE id = ?", [row.id]);
    }
  }

  const [projectMemberRoleColumns] = await pool.execute("SHOW COLUMNS FROM project_members LIKE 'role'");
  if (projectMemberRoleColumns.length > 0) {
    await pool.execute("UPDATE project_members SET role = 'admin' WHERE role = 'editor'");
    await pool.execute("UPDATE project_members SET role = 'member' WHERE role = 'viewer'");
    await pool.execute("ALTER TABLE project_members MODIFY role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member'");
  }

  const [rankColumns] = await pool.execute("SHOW TABLES LIKE 'team_ranks'");
  if (rankColumns.length === 0) {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS team_ranks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_id INT NOT NULL,
        name VARCHAR(80) NOT NULL,
        color VARCHAR(16) NOT NULL DEFAULT '#5b5fef',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY team_ranks_team_name_unique (team_id, name),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )
    `);
  }

  const [teamMemberRankColumns] = await pool.execute("SHOW COLUMNS FROM team_members LIKE 'rank_id'");
  if (teamMemberRankColumns.length === 0) {
    await pool.execute('ALTER TABLE team_members ADD COLUMN rank_id INT NULL AFTER role');
    await pool.execute('ALTER TABLE team_members ADD CONSTRAINT team_members_rank_id_fk FOREIGN KEY (rank_id) REFERENCES team_ranks(id) ON DELETE SET NULL');
  }

  const [teamInvitationsTables] = await pool.execute("SHOW TABLES LIKE 'team_invitations'");
  if (teamInvitationsTables.length === 0) {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS team_invitations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_id INT NOT NULL,
        email VARCHAR(254) NOT NULL,
        role ENUM('admin', 'member') DEFAULT 'member',
        invited_by_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'revoked') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY team_invitations_unique_pending (team_id, email, status),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  logger.info('Database schema verified');
}

export async function connectDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    logger.info('Connected to MySQL');
    await initializeSchema();
  } finally {
    connection.release();
  }
}

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closeDatabase() {
  await pool.end();
}
