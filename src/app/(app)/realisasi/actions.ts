"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { DEMO_MODE } from "@/lib/config";
import { logActivity } from "@/lib/activity";
import {
  sanitizeRealisasiMap,
  projectRealisasiTotal,
  type RealisasiMap,
} from "@/lib/realisasi-template";

export type ActionResult = { ok: boolean; message: string; total?: number };

/**
 * Save a project's realisasi map. The weighted total is written to
 * projects.progress so it flows to the dashboard & client portal.
 */
export async function saveRealisasi(
  projectId: string,
  map: RealisasiMap
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!can(profile?.role, "progress:update")) {
    return { ok: false, message: "Anda tidak memiliki izin mengubah realisasi." };
  }

  const clean = sanitizeRealisasiMap(map);
  const total = projectRealisasiTotal(clean);

  if (DEMO_MODE) {
    return { ok: true, message: "Realisasi disimpan (mode demo).", total };
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("projects")
    .update({ realisasi: clean, progress: total })
    .eq("id", projectId)
    .select("id");
  if (error) return { ok: false, message: error.message };
  // RLS only lets the project's PM or a Super Admin update — surface a clear
  // error instead of a silent no-op when 0 rows were affected.
  if (!updated || updated.length === 0) {
    return {
      ok: false,
      message: "Tidak berhak mengubah realisasi proyek ini (hanya PM proyek atau Super Admin).",
    };
  }

  await logActivity({
    projectId,
    userId: profile!.id,
    type: "progress",
    description: `memperbarui realisasi progres menjadi ${total}%`,
  });

  revalidatePath(`/realisasi/${projectId}`);
  revalidatePath("/realisasi");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true, message: `Realisasi disimpan. Progres proyek: ${total}%.`, total };
}
