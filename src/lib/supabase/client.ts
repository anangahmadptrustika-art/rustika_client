import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components ("use client").
 * Reads the public env vars that are inlined into the browser bundle.
 *
 * Note: the client is intentionally untyped at the SDK boundary. Row shapes are
 * applied in the data-access layer (`src/lib/queries.ts`) via the `Database`
 * types, which keeps `.insert()/.update()` ergonomic while reads stay typed.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
