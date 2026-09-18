import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  supabaseAnonKey,
  supabaseServerUrl,
} from "@/lib/supabase/config";

type CookiesToSet = Parameters<SetAllCookies>[0];

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * Wires Supabase auth into Next.js cookies so sessions persist & refresh.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseServerUrl(), supabaseAnonKey(), {
    cookieOptions: { name: AUTH_COOKIE_NAME },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if middleware refreshes sessions.
        }
      },
    },
  });
}

/**
 * Privileged client using the service-role key. SERVER ONLY.
 * Bypasses RLS — use sparingly (admin tasks, AI indexing, webhooks).
 */
export function createAdminClient() {
  const {
    createClient: createSupabaseClient,
  } = require("@supabase/supabase-js");
  return createSupabaseClient(
    supabaseServerUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
