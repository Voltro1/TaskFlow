import { AppError } from './app-error.js';

const PROJECT_CAPABILITIES = Object.freeze({
  edit_project: ['owner', 'admin'],
  delete_project: ['owner'],
  manage_members: ['owner', 'admin'],
  manage_admins: ['owner', 'admin'],
  create_task: ['owner', 'admin'],
  edit_task: ['owner', 'admin'],
  delete_task: ['owner', 'admin'],
  assign_task: ['owner', 'admin'],
  change_task_status: ['owner', 'admin', 'member'],
  claim_task: ['owner', 'admin', 'member'],
  change_task_priority: ['owner', 'admin']
});

// check project permissions
export function requireProjectCapability(role, capability) {
  if (!PROJECT_CAPABILITIES[capability]?.includes(role)) {
    throw new AppError('Insufficient project permissions', 403);
  }
}