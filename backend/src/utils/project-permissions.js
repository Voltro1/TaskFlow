import { AppError } from './app-error.js';

export const PROJECT_ROLES = Object.freeze(['owner', 'admin', 'member']);

export const PROJECT_CAPABILITIES = Object.freeze({
  view_project: ['owner', 'admin', 'member'],
  view_project_data: ['owner', 'admin', 'member'],
  edit_project: ['owner', 'admin'],
  manage_settings: ['owner', 'admin'],
  delete_project: ['owner'],
  manage_members: ['owner', 'admin'],
  manage_admins: ['owner', 'admin'],
  create_task: ['owner', 'admin'],
  edit_task: ['owner', 'admin'],
  delete_task: ['owner', 'admin'],
  assign_task: ['owner', 'admin'],
  change_task_status: ['owner', 'admin', 'member'],
  claim_task: ['owner', 'admin', 'member'],
  change_task_priority: ['owner', 'admin'],
  manage_tags: ['owner', 'admin'],
});

export function hasProjectCapability(role, capability) {
  return PROJECT_CAPABILITIES[capability]?.includes(role) ?? false;
}

export function requireProjectCapability(role, capability) {
  if (!hasProjectCapability(role, capability)) {
    throw new AppError('Insufficient project permissions', 403);
  }
}
