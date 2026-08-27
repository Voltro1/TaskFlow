export const PROJECT_MEMBER_ROLES = Object.freeze(['owner', 'editor', 'viewer']);

export function mapProjectRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    ownerId: row.ownerId ?? row.owner_id,
    archived: Boolean(row.archived),
    color: row.color ?? '#5b5fef',
    imageData: row.imageData ?? row.image_data ?? null,
    createdAt: row.createdAt ?? row.created_at
  };
}
