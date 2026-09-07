// manager email
const PLATFORM_ADMIN_EMAIL = 'voltro.oc@gmail.com';

// normalize email aliases
export function normalizeEmail(email) {
  const normalized = String(email ?? '')
    .toLowerCase()
    .trim();
  const [localPart, domain] = normalized.split('@');
  if (!localPart || !domain) {
    return normalized;
  }
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${localPart.split('+')[0].replace(/\./g, '')}@gmail.com`;
  }
  return normalized;
}

// check manager email
export function isPlatformAdminEmail(email) {
  return normalizeEmail(email) === normalizeEmail(PLATFORM_ADMIN_EMAIL);
}