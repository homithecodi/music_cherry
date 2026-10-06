import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");
  if (!target) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Invalid url parameter", { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return new Response("Unsupported protocol", { status: 400 });
  }

  const host = request.headers.get("host");
  if (host && parsed.host === host) {
    return new Response("Cannot proxy to this host", { status: 400 });
  }

  const range = request.headers.get("range");
  const upstream = await fetch(parsed.href, {
    method: "GET",
    redirect: "follow",
    headers: range ? { range } : {},
  }).catch(() => null);

  if (!upstream || (!upstream.ok && upstream.status !== 206)) {
    return new Response(
      `Upstream request failed${upstream ? ` (${upstream.status})` : ""}`,
      { status: 502 },
    );
  }

  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Range, Content-Range, Content-Type",
    "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
  });

  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const acceptRanges = upstream.headers.get("accept-ranges");
  if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new Response(upstream.body, { status: upstream.status, headers });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Range, Content-Range, Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
