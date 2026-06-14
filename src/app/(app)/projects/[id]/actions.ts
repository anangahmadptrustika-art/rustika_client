"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { DEMO_MODE } from "@/lib/config";
import type { ApprovalStatus } from "@/lib/constants";

export type ActionResult = { ok: boolean; message: string };

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

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "Komentar terkirim." };
}
