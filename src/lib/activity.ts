import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/config";
import type { ActivityType } from "@/lib/constants";

/**
 * Best-effort activity logger powering the Timeline. Failures never block the
 * primary action.
 */
export async function logActivity(input: {
  projectId: string;
  userId?: string | null;
  type: ActivityType;
  entityType?: string;
  entityId?: string;
  description: string;
}) {
  if (DEMO_MODE) return;
  try {
    const supabase = await createClient();
    await supabase.from("activities").insert({
      project_id: input.projectId,
      user_id: input.userId ?? null,
      type: input.type,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      description: input.description,
    });
  } catch {
    // ignore — timeline logging is non-critical
  }
}
