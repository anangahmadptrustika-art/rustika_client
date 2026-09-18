import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE } from "@/lib/config";
import {
  AUTH_COOKIE_NAME,
  supabaseAnonKey,
  supabaseServerUrl,
} from "@/lib/supabase/config";

type CookiesToSet = Parameters<SetAllCookies>[0];

const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/api/auth",
  "/api/sync",
  "/api/status",
  "/portal",
];
const MARKETING_PATHS = ["/"];

/**
 * Refreshes the Supabase session on every request and enforces a coarse
 * auth boundary: unauthenticated users are redirected to /login when they
 * try to reach the app shell. Fine-grained authorization is handled by RLS
 * and per-page checks.
 */
export async function updateSession(request: NextRequest) {
  // Demo mode (no Supabase env): skip session refresh & auth guard entirely.
  if (DEMO_MODE) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseServerUrl(), supabaseAnonKey(), {
    cookieOptions: { name: AUTH_COOKIE_NAME },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    MARKETING_PATHS.includes(pathname);

  // Unauthenticated → bounce to login (except public/marketing pages).
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting /login → send to dashboard.
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
