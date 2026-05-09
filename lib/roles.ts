export const APP_ROLES = ["STUDENT", "INSTRUCTOR", "MOD", "ADMIN"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const MOD_ASSIGNABLE_ROLES = ["STUDENT", "INSTRUCTOR"] as const;
export const ADMIN_ASSIGNABLE_ROLES = APP_ROLES;

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && APP_ROLES.includes(role as AppRole);
}

export function isAdminRole(role: unknown) {
  return role === "ADMIN";
}

export function isModRole(role: unknown) {
  return role === "MOD";
}

export function canAccessAdminControls(role: unknown) {
  return role === "ADMIN" || role === "MOD";
}

export function canManageQuizGlobally(role: unknown) {
  return role === "ADMIN" || role === "MOD";
}

export function canAccessInstructorArea(role: unknown) {
  return role === "INSTRUCTOR" || role === "ADMIN" || role === "MOD";
}

export function canEditInstructorQuiz(role: unknown) {
  return role === "INSTRUCTOR" || role === "ADMIN";
}

export function canAccessQuizAnalytics(role: unknown) {
  return role === "INSTRUCTOR" || role === "ADMIN" || role === "MOD";
}

export function canAssignRole(actorRole: unknown, nextRole: unknown) {
  if (!isAppRole(nextRole)) return false;
  if (actorRole === "ADMIN") return true;
  if (actorRole === "MOD") return MOD_ASSIGNABLE_ROLES.includes(nextRole as (typeof MOD_ASSIGNABLE_ROLES)[number]);
  return false;
}

export function roleLabel(role: string) {
  const normalized = role.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
