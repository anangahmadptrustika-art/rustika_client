/**
 * Domain constants for CLIENT RUSTIKA CONSULTANT.
 * These mirror the PostgreSQL enums declared in the SQL migrations,
 * keep them in sync with `supabase/migrations`.
 */

export const APP_NAME = "Client Rustika Consultant";
export const APP_SHORT = "Rustika Portal";

// ── Roles ────────────────────────────────────────────────────
export const USER_ROLES = ["super_admin", "project_manager", "staff", "client"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  project_manager: "Project Manager",
  staff: "Staff",
  client: "Client",
};

export const STAFF_CATEGORIES = [
  "surveyor",
  "architect",
  "drafter",
  "engineer",
  "admin",
] as const;
export type StaffCategory = (typeof STAFF_CATEGORIES)[number];

export const STAFF_CATEGORY_LABELS: Record<StaffCategory, string> = {
  surveyor: "Surveyor",
  architect: "Arsitek",
  drafter: "Drafter",
  engineer: "Engineer",
  admin: "Admin",
};

// ── Project status ───────────────────────────────────────────
export const PROJECT_STATUSES = [
  "PBG",
  "SLF",
  "PBG UNDER CONSTRUCTION",
  "SLF UNDER CONSTRUCTION",
  "CONSTRUCTION",
  "DESIGN",
  "SUPERVISI",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PBG: "PBG",
  SLF: "SLF",
  "PBG UNDER CONSTRUCTION": "PBG Under Construction",
  "SLF UNDER CONSTRUCTION": "SLF Under Construction",
  CONSTRUCTION: "Construction",
  DESIGN: "Design",
  SUPERVISI: "Supervisi",
};

/** Tailwind classes per status badge. */
export const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  PBG: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  SLF: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "PBG UNDER CONSTRUCTION": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "SLF UNDER CONSTRUCTION": "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  CONSTRUCTION: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  DESIGN: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  SUPERVISI: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
};

// ── Project types ────────────────────────────────────────────
export const PROJECT_TYPES = [
  "Konsultan Arsitektur",
  "Konsultan Sipil",
  "Survey & Pemetaan",
  "Drone Mapping",
  "Kajian Teknis",
  "SIMBG",
  "Perencanaan",
  "Pengawasan",
] as const;

// ── Documents ────────────────────────────────────────────────
export const DOCUMENT_CATEGORIES = [
  "kajian_teknis",
  "simbg",
  "survey",
  "drone",
  "invoice",
  "other",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  kajian_teknis: "Kajian Teknis",
  simbg: "SIMBG Drawing",
  survey: "Survey",
  drone: "Drone Mapping",
  invoice: "Invoice",
  other: "Lainnya",
};

export const SIMBG_SUBCATEGORIES = ["Arsitektur", "Struktur", "MEP", "Siteplan"] as const;
export const DRONE_SUBCATEGORIES = [
  "Orthomosaic",
  "DSM",
  "DTM",
  "Point Cloud",
  "Foto Udara",
] as const;

// ── Images ───────────────────────────────────────────────────
export const IMAGE_CATEGORIES = ["existing", "survey", "progress", "final"] as const;
export type ImageCategory = (typeof IMAGE_CATEGORIES)[number];

export const IMAGE_CATEGORY_LABELS: Record<ImageCategory, string> = {
  existing: "Existing Condition",
  survey: "Survey",
  progress: "Progress",
  final: "Final Documentation",
};

// ── Invoice status ───────────────────────────────────────────
export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
};

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  overdue: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

// ── Approval status ──────────────────────────────────────────
export const APPROVAL_STATUSES = ["pending", "approved", "revision_requested"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  revision_requested: "Revision Requested",
};

export const APPROVAL_STATUS_STYLES: Record<ApprovalStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  revision_requested: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

// ── Activity & notification types ────────────────────────────
export const ACTIVITY_TYPES = [
  "upload",
  "progress",
  "approval",
  "comment",
  "login",
  "project",
  "invoice",
  "member",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const NOTIFICATION_TYPES = [
  "document_uploaded",
  "progress_updated",
  "approval_required",
  "invoice_created",
  "comment_added",
  "mention",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ── Storage buckets ──────────────────────────────────────────
export const STORAGE_BUCKETS = {
  documents: "project-documents",
  images: "project-images",
  avatars: "avatars",
} as const;

/**
 * Max upload size per file (MB). Cloudinary's free plan caps a single
 * upload at 10 MB; raise this if the storage plan is upgraded.
 */
export const MAX_UPLOAD_MB = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** Target after image compression (large photos shrink automatically). */
export const IMAGE_COMPRESS_MAX_MB = 2;
export const IMAGE_COMPRESS_MAX_DIMENSION = 2400;
