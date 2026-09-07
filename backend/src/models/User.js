// map user records
export const USER_ROLES = Object.freeze(['user', 'admin']);

// map user details
export function mapUserRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    username: row.username ?? row.name,
    email: row.email,
    role: row.role ?? row.userRole,
    isActive: Boolean(row.isActive ?? row.is_active),
    profileImageData: row.profileImageData ?? row.profile_image_data ?? null,
    createdAt: row.createdAt ?? row.created_at
  };
}

// include password hash
export function mapUserAuthRow(row) {
  if (!row) {
    return null;
  }
  return {
    ...mapUserRow(row),
    passwordHash: row.passwordHash ?? row.password_hash
  };
}