/**
 * Role-Based Access Control (RBAC) for CLIENT RUSTIKA CONSULTANT.
 *
 * This is the single source of truth for the permission matrix that is
 * enforced in the UI. The authoritative enforcement lives in Postgres
 * Row Level Security (see `supabase/migrations`), but mirroring it here
 * keeps the interface honest (hide what the user cannot do).
 */

import type { UserRole } from "./constants";

export type Permission =
  // Projects
  | "project:create"
  | "project:edit"
  | "project:delete"
  | "project:view_all"
  | "project:view_assigned"
  | "project:view_own"
  // Team
  | "team:manage"
  // Documents & media
  | "document:upload"
  | "document:download"
  | "document:delete"
  // Progress
  | "progress:update"
  // Reports
  | "report:create"
  // Finance
  | "invoice:view"
  | "invoice:manage"
  // Approvals
  | "approval:request"
  | "approval:respond"
  // Discussion
  | "comment:create"
  // Administration
  | "user:manage"
  | "client:manage";

const ALL: Permission[] = [
  "project:create",
  "project:edit",
  "project:delete",
  "project:view_all",
  "project:view_assigned",
  "project:view_own",
  "team:manage",
  "document:upload",
  "document:download",
  "document:delete",
  "progress:update",
  "report:create",
  "invoice:view",
  "invoice:manage",
  "approval:request",
  "approval:respond",
  "comment:create",
  "user:manage",
  "client:manage",
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Super Admin — everything.
  super_admin: ALL,

  // Project Manager — create projects, manage teams, upload, see assigned.
  project_manager: [
    "project:create",
    "project:edit",
    "project:view_assigned",
    "team:manage",
    "document:upload",
    "document:download",
    "document:delete",
    "progress:update",
    "report:create",
    "invoice:view",
    "invoice:manage",
    "approval:request",
    "comment:create",
    "client:manage",
  ],

  // Staff — upload, update progress, create reports. NO finance access.
  staff: [
    "project:view_assigned",
    "document:upload",
    "document:download",
    "progress:update",
    "report:create",
    "comment:create",
  ],

  // Client — view their own projects, download, comment, approve.
  client: [
    "project:view_own",
    "document:download",
    "invoice:view",
    "approval:respond",
    "comment:create",
  ],
};

/** Returns true if the role grants the given permission. */
export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Returns true if the role grants ANY of the given permissions. */
export function canAny(role: UserRole | null | undefined, perms: Permission[]): boolean {
  return perms.some((p) => can(role, p));
}

/** Convenience guards used throughout the UI. */
export const isSuperAdmin = (role?: UserRole | null) => role === "super_admin";
export const isManager = (role?: UserRole | null) => role === "project_manager";
export const isStaff = (role?: UserRole | null) => role === "staff";
export const isClient = (role?: UserRole | null) => role === "client";

/** Can this role see finance data (invoices, contract value)? */
export const canViewFinance = (role?: UserRole | null) => can(role, "invoice:view");

/**
 * Human-readable permission matrix used to render the documentation table
 * in the admin settings page and the README.
 */
export const PERMISSION_MATRIX: {
  feature: string;
  super_admin: boolean;
  project_manager: boolean;
  staff: boolean;
  client: boolean;
}[] = [
  { feature: "Create Project", super_admin: true, project_manager: true, staff: false, client: false },
  { feature: "Manage Team", super_admin: true, project_manager: true, staff: false, client: false },
  { feature: "Upload Documents", super_admin: true, project_manager: true, staff: true, client: false },
  { feature: "Download Documents", super_admin: true, project_manager: true, staff: true, client: true },
  { feature: "Update Progress", super_admin: true, project_manager: true, staff: true, client: false },
  { feature: "Create Report", super_admin: true, project_manager: true, staff: true, client: false },
  { feature: "View Finance / Invoice", super_admin: true, project_manager: true, staff: false, client: true },
  { feature: "Manage Invoice", super_admin: true, project_manager: true, staff: false, client: false },
  { feature: "Request Approval", super_admin: true, project_manager: true, staff: false, client: false },
  { feature: "Respond Approval", super_admin: true, project_manager: false, staff: false, client: true },
  { feature: "Comment / Discussion", super_admin: true, project_manager: true, staff: true, client: true },
  { feature: "Manage Users", super_admin: true, project_manager: false, staff: false, client: false },
  { feature: "Manage Clients", super_admin: true, project_manager: true, staff: false, client: false },
  { feature: "View All Projects", super_admin: true, project_manager: false, staff: false, client: false },
];
