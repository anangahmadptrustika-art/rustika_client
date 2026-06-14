"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { DEMO_MODE } from "@/lib/config";
import type { ProjectStatus } from "@/lib/constants";

export type ActionResult = { ok: boolean; message: string };

export async function createProject(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!can(profile?.role, "project:create")) {
    return { ok: false, message: "Anda tidak memiliki izin membuat proyek." };
  }

  const payload = {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    client_id: String(formData.get("client_id") ?? ""),
    project_type: String(formData.get("project_type") ?? "") || null,
    location: String(formData.get("location") ?? "") || null,
    area_size: formData.get("area_size") ? Number(formData.get("area_size")) : null,
    start_date: String(formData.get("start_date") ?? "") || null,
    end_date: String(formData.get("end_date") ?? "") || null,
    contract_value: formData.get("contract_value")
      ? Number(formData.get("contract_value"))
      : null,
    status: (String(formData.get("status") ?? "planning") as ProjectStatus) || "planning",
    description: String(formData.get("description") ?? "") || null,
  };

  if (!payload.code || !payload.name || !payload.client_id) {
    return { ok: false, message: "Kode, nama, dan client wajib diisi." };
  }

  if (DEMO_MODE) {
    // No persistence in demo mode — pretend success.
    return { ok: true, message: "Proyek berhasil dibuat (mode demo)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .insert({ ...payload, project_manager_id: profile!.id, created_by: profile!.id });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/projects");
  return { ok: true, message: "Proyek berhasil dibuat." };
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!can(profile?.role, "project:edit")) {
    return { ok: false, message: "Tidak diizinkan." };
  }
  if (DEMO_MODE) return { ok: true, message: "Status diperbarui (mode demo)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", projectId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "Status proyek diperbarui." };
}
