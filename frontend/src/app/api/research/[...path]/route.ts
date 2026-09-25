import { NextRequest, NextResponse } from "next/server";

/**
 * Read-only proxy to the Python FastAPI research service (port 3031).
 *
 * ARCHITECTURE: Frontend -> this Next.js API route -> FastAPI -> research outputs.
 *
 * The browser calls same-origin relative URLs (`/api/research/...`). When the
 * page is accessed through the Caddy gateway, URLs carrying
 * `?XTransformPort=3031` are routed to FastAPI directly instead, so both
 * access modes are supported with identical client code. This route forwards
 * the full query string (required by the parameterised endpoints
 * /experiment and /replay), performs a short in-memory cache keyed by
 * path + query, and never modifies upstream payloads. The XTransformPort
 * query itself is never forwarded upstream (it is gateway-only metadata).
 */

const UPSTREAM = process.env.RESEARCH_API_URL || "http://127.0.0.1:3031";
const TTL_MS = 60_000;

const cache = new Map<string, { body: string; expires: number }>();

const SEGMENT_RE = /^[a-zA-Z0-9_-]+$/;

function keyFor(segments: string[]): string | null {
  if (segments.length === 0 || segments.length > 2) return null;
  for (const segment of segments) {
    if (!SEGMENT_RE.test(segment)) return null;
  }
  return segments.join("/");
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  const key = keyFor(path ?? []);
  if (!key) {
    return NextResponse.json({ error: "invalid research API path" }, { status: 400 });
  }

  // Forward the query string (minus the gateway-only XTransformPort param).
  const upstreamQuery = new URLSearchParams(req.nextUrl.searchParams);
  upstreamQuery.delete("XTransformPort");
  const qs = upstreamQuery.toString();
  const cacheKey = qs ? `${key}?${qs}` : key;

  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return new NextResponse(cached.body, {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=60",
        "x-research-cache": "hit",
      },
    });
  }

  try {
    const upstream = await fetch(
      `${UPSTREAM}/api/research/${key}${qs ? `?${qs}` : ""}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: { accept: "application/json" },
      },
    );
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "research service unavailable", status: upstream.status },
        { status: 502 },
      );
    }
    const body = await upstream.text();
    cache.set(cacheKey, { body, expires: Date.now() + TTL_MS });
    return new NextResponse(body, {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=60",
        "x-research-cache": "miss",
      },
    });
  } catch {
    return NextResponse.json({ error: "research service unreachable" }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";
