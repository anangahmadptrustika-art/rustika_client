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
  const { error } = await supabase
    .from("projects")
    .update({ realisasi: clean, progress: total })
    .eq("id", projectId);
  if (error) return { ok: false, message: error.message };

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
