import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import { DEMO_MODE } from "@/lib/config";
import { demoProfile } from "@/lib/demo-data";

/**
 * Returns the authenticated user's profile, or null.
 * In DEMO_MODE (no Supabase env configured) returns a seeded demo profile so
 * the UI is fully browsable without a backend.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  if (DEMO_MODE) return demoProfile;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ?? null;
}

/** Require an authenticated profile or redirect to /login. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Require one of the given roles or redirect to /dashboard. */
export async function requireRole(
  roles: Profile["role"][]
): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect("/dashboard");
  return profile;
}
