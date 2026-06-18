/**
 * Database types for CLIENT RUSTIKA CONSULTANT.
 *
 * Hand-authored to match `supabase/migrations`. In a live project these can be
 * regenerated with:
 *   supabase gen types typescript --project-id <ref> > src/types/database.ts
 */

import type {
  ActivityType,
  ApprovalStatus,
  DocumentCategory,
  ImageCategory,
  InvoiceStatus,
  NotificationType,
  ProjectStatus,
  StaffCategory,
  UserRole,
} from "@/lib/constants";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  staff_category: StaffCategory | null;
  phone: string | null;
  client_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  share_token: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client_id: string;
  project_type: string | null;
  location: string | null;
  area_size: number | null;
  project_manager_id: string | null;
  start_date: string | null;
  end_date: string | null;
  contract_value: number | null;
  status: ProjectStatus;
  progress: number;
  description: string | null;
  share_token?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role_in_project: string | null;
  created_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  category: DocumentCategory;
  subcategory: string | null;
  name: string;
  file_path: string;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  version: number;
  description: string | null;
  storage: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface ProjectImage {
  id: string;
  project_id: string;
  category: ImageCategory;
  title: string | null;
  file_path: string;
  file_url: string | null;
  file_size: number | null;
  tags: string[] | null;
  taken_at: string | null;
  storage: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface ProjectProgress {
  id: string;
  project_id: string;
  report_date: string;
  progress_percent: number;
  division: string | null;
  description: string | null;
  obstacle: string | null;
  solution: string | null;
  documentation_urls: string[] | null;
  created_by: string | null;
  created_at: string;
}

export interface AreaData {
  id: string;
  project_id: string;
  luas_site: number | null;
  luas_bangunan: number | null;
  luas_lantai: number | null;
  kdb: number | null;
  klb: number | null;
  kdh: number | null;
  gsb: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  project_id: string;
  invoice_number: string;
  termin: string | null;
  amount: number;
  issue_date: string | null;
  due_date: string | null;
  status: InvoiceStatus;
  invoice_file_url: string | null;
  receipt_file_url: string | null;
  tax_file_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  project_id: string;
  document_id: string | null;
  title: string;
  description: string | null;
  status: ApprovalStatus;
  requested_by: string | null;
  responded_by: string | null;
  response_note: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  attachment_url: string | null;
  mentions: string[] | null;
  created_at: string;
}

export interface Activity {
  id: string;
  project_id: string | null;
  user_id: string | null;
  type: ActivityType;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  metadata: Json | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  project_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ── Composed / joined view-models used in the UI ──────────────
export interface ProjectWithRelations extends Project {
  client?: Client | null;
  project_manager?: Profile | null;
}

export interface CommentWithAuthor extends Comment {
  author?: Profile | null;
  replies?: CommentWithAuthor[];
}

export interface ActivityWithActor extends Activity {
  actor?: Profile | null;
}

/**
 * Minimal Supabase `Database` shape so `createClient<Database>()` is typed.
 * `TableDef` includes the `Relationships` key required for supabase-js to treat
 * the schema as valid (otherwise `.insert()/.update()` infer `never`).
 */
type TableDef<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      clients: TableDef<Client>;
      projects: TableDef<Project>;
      project_members: TableDef<ProjectMember>;
      project_documents: TableDef<ProjectDocument>;
      project_images: TableDef<ProjectImage>;
      project_progress: TableDef<ProjectProgress>;
      area_data: TableDef<AreaData>;
      invoices: TableDef<Invoice>;
      approvals: TableDef<Approval>;
      comments: TableDef<Comment>;
      activities: TableDef<Activity>;
      notifications: TableDef<Notification>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
