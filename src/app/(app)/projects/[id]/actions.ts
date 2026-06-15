"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { DEMO_MODE } from "@/lib/config";
import { logActivity } from "@/lib/activity";
import type { ApprovalStatus } from "@/lib/constants";

export type ActionResult = { ok: boolean; message: string };

export async function addProgressReport(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!can(profile?.role, "progress:update")) {
    return { ok: false, message: "Tidak diizinkan." };
  }
  const projectId = String(formData.get("project_id") ?? "");
  const report_date =
    String(formData.get("report_date") ?? "") ||
    new Date().toISOString().slice(0, 10);
  const progress_percent = Number(formData.get("progress_percent") ?? 0);
  const division = String(formData.get("division") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const obstacle = String(formData.get("obstacle") ?? "").trim() || null;
  const solution = String(formData.get("solution") ?? "").trim() || null;

  if (!projectId) return { ok: false, message: "Proyek tidak valid." };
  if (Number.isNaN(progress_percent) || progress_percent < 0 || progress_percent > 100) {
    return { ok: false, message: "Persentase harus antara 0 dan 100." };
  }
  if (DEMO_MODE) return { ok: true, message: "Laporan progress ditambahkan (mode demo)." };

  const supabase = await createClient();
  const { error } = await supabase.from("project_progress").insert({
    project_id: projectId,
    report_date,
    progress_percent,
    division,
    description,
    obstacle,
    solution,
    created_by: profile!.id,
  });
  if (error) return { ok: false, message: error.message };

  await logActivity({
    projectId,
    userId: profile!.id,
    type: "progress",
    entityType: "progress",
    description: `memperbarui progress menjadi ${progress_percent}%${division ? ` (${division})` : ""}`,
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "Laporan progress ditambahkan." };
}

export async function addInvoice(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!can(profile?.role, "invoice:manage")) {
    return { ok: false, message: "Tidak diizinkan." };
  }
  const projectId = String(formData.get("project_id") ?? "");
  const invoice_number = String(formData.get("invoice_number") ?? "").trim();
  const termin = String(formData.get("termin") ?? "").trim() || null;
  const amount = Number(formData.get("amount") ?? 0);
  const issue_date = String(formData.get("issue_date") ?? "") || null;
  const due_date = String(formData.get("due_date") ?? "") || null;
  const status = String(formData.get("status") ?? "draft");

  if (!projectId || !invoice_number) {
    return { ok: false, message: "Nomor invoice wajib diisi." };
  }
  if (DEMO_MODE) return { ok: true, message: "Invoice ditambahkan (mode demo)." };

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").insert({
    project_id: projectId,
    invoice_number,
    termin,
    amount: Number.isNaN(amount) ? 0 : amount,
    issue_date,
    due_date,
    status,
    created_by: profile!.id,
  });
  if (error) return { ok: false, message: error.message };

  await logActivity({
    projectId,
    userId: profile!.id,
    type: "invoice",
    entityType: "invoice",
    description: `menambahkan invoice ${invoice_number}`,
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "Invoice ditambahkan." };
}

export async function respondApproval(
  approvalId: string,
  projectId: string,
  status: Extract<ApprovalStatus, "approved" | "revision_requested">,
  note: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!can(profile?.role, "approval:respond")) {
    return { ok: false, message: "Hanya client yang dapat memberi approval." };
  }

  if (DEMO_MODE) {
    return {
      ok: true,
      message:
        status === "approved"
          ? "Dokumen disetujui (mode demo)."
          : "Permintaan revisi terkirim (mode demo).",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("approvals")
    .update({
      status,
      response_note: note || null,
      responded_by: profile!.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", approvalId);

  if (error) return { ok: false, message: error.message };

  await logActivity({
    projectId,
    userId: profile!.id,
    type: "approval",
    entityType: "approval",
    entityId: approvalId,
    description:
      status === "approved"
        ? "menyetujui sebuah dokumen"
        : "meminta revisi pada sebuah dokumen",
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "Approval diperbarui." };
}

export async function postComment(
  projectId: string,
  body: string,
  parentId?: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!can(profile?.role, "comment:create")) {
    return { ok: false, message: "Tidak diizinkan." };
  }
  if (!body.trim()) return { ok: false, message: "Komentar tidak boleh kosong." };

  if (DEMO_MODE) return { ok: true, message: "Komentar terkirim (mode demo)." };

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    project_id: projectId,
    user_id: profile!.id,
    body: body.trim(),
    parent_id: parentId ?? null,
  });

  if (error) return { ok: false, message: error.message };

  await logActivity({
    projectId,
    userId: profile!.id,
    type: "comment",
    entityType: "comment",
    description: "menambahkan komentar pada diskusi proyek",
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "Komentar terkirim." };
}
