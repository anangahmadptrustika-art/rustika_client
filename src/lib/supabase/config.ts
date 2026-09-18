/**
 * Shared Supabase connection settings.
 *
 * Self-hosted deployment: the browser reaches the auth/REST API through the
 * public site (`https://<domain>/supabase-api`, routed by the Caddy gateway),
 * while server-side code talks to the gateway directly over the Docker
 * network (`SUPABASE_INTERNAL_URL`, e.g. `http://gateway:8000/supabase-api`).
 *
 * supabase-js derives its session cookie name from the URL's hostname, so the
 * two URLs would otherwise produce two different cookie names and the server
 * would never see the browser's session. Pinning the cookie name keeps both
 * sides in sync regardless of which URL each one uses.
 */
export const AUTH_COOKIE_NAME = "sb-rustika-auth-token";

/** Anon key is public by design (RLS protects the data). */
export function supabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
}

/** URL used by server-side code (SSR, server actions, middleware). */
export function supabaseServerUrl(): string {
  return (
    process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
  );
}
