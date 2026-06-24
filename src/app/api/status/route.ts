import { NextResponse } from "next/server";

// Status endpoint for external monitoring. Node runtime (needs process.*),
// always dynamic so it is never cached/prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store, max-age=0",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export function GET(req: Request) {
  const mem = process.memoryUsage();
  return NextResponse.json(
    {
      status: "ok",
      app:
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        req.headers.get("host") ||
        "",
      version: process.env.VERCEL_GIT_COMMIT_REF || "main",
      commit: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7),
      region: process.env.VERCEL_REGION || "local",
      node: process.version,
      memoryMB: Math.round(mem.rss / 1048576),
      uptimeSec: Math.round(process.uptime()),
      time: new Date().toISOString(),
    },
    { headers: CORS }
  );
}
