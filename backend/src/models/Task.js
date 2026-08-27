export const TASK_STATUSES = Object.freeze(['todo', 'in_progress', 'in_review', 'done']);
export const TASK_PRIORITIES = Object.freeze(['low', 'medium', 'high', 'urgent']);

export function mapTaskRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.projectId ?? row.project_id,
    title: row.title,
    description: row.description ?? '',
    status: row.status,
    priority: row.priority,
    progress: Number(row.progress ?? 0),
    color: row.color ?? null,
    notes: row.notes ?? 'No extra details',
    assignee: row.assigneeId
      ? {
          id: row.assigneeId,
          name: row.assigneeName,
          email: row.assigneeEmail,
          role: row.assigneeRole,
          isActive: Boolean(row.assigneeIsActive),
          createdAt: row.assigneeCreatedAt
        }
      : null,
    dueDate: row.dueDate ?? row.due_date ?? null,
    createdBy: row.createdById
      ? {
          id: row.createdById,
          name: row.createdByName,
          email: row.createdByEmail,
          role: row.createdByRole,
          isActive: Boolean(row.createdByIsActive),
          createdAt: row.createdByCreatedAt
        }
      : null,
    createdAt: row.createdAt ?? row.created_at
  };
}
