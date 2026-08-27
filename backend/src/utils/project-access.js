import { query } from '../config/database.js';
import { AppError } from './app-error.js';

export async function getProjectAccess(projectId, user) {
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
        p.created_at AS createdAt,
        pm.role AS membershipRole
      FROM projects p
      LEFT JOIN project_members pm
        ON pm.project_id = p.id AND pm.user_id = ?
      WHERE p.id = ?
      LIMIT 1
    `,
    [user.id, projectId]
  );
  const project = rows[0];
  if (!project) throw new AppError('Project not found', 404);
  if (!project.membershipRole) throw new AppError('You do not have access to this project', 403);
  return { project, role: project.membershipRole };
}
