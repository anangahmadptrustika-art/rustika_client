/**
 * Runtime configuration flags.
 *
 * DEMO_MODE is enabled automatically when Supabase env vars are absent.
 * In demo mode the app renders with seeded sample data so reviewers can
 * explore every screen without provisioning a backend. As soon as the
 * NEXT_PUBLIC_SUPABASE_* vars are present, the app talks to Supabase.
 */
export const DEMO_MODE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR-PROJECT");

export const AI_ENABLED = !!process.env.ANTHROPIC_API_KEY;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
