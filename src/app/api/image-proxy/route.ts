import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isPrivateHost(hostname: string): boolean {
  const privateSuffixes = [
    ".local", ".localhost", ".internal", ".lan",
    ".home", ".corp", ".test", ".example", ".invalid",
  ];
  if (privateSuffixes.some((s) => hostname.endsWith(s))) return true;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "[::1]") return true;
  if (/^169\.254\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^127\./.test(hostname)) return true;
  if (/^fc00:/i.test(hostname) || /^fe80:/i.test(hostname)) return true;
  if (hostname === "metadata.google.internal" || hostname === "169.254.169.254") return true;
  return false;
}

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  if (!/^https?:\/\//i.test(url))
    return new NextResponse("Invalid url", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (isPrivateHost(parsed.hostname))
    return new NextResponse("Forbidden", { status: 403 });

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!resp.ok)
      return new NextResponse("Fetch failed", { status: resp.status });

    const contentType = resp.headers.get("content-type") || "";
    if (!ALLOWED_CONTENT_TYPES.has(contentType.split(";")[0].trim().toLowerCase()))
      return new NextResponse("Unsupported content type", { status: 415 });

    const maxSize = 10 * 1024 * 1024;
    const contentLength = Number(resp.headers.get("content-length"));
    if (contentLength && contentLength > maxSize)
      return new NextResponse("Content too large", { status: 413 });

    const buffer = await resp.arrayBuffer();
    if (buffer.byteLength > maxSize)
      return new NextResponse("Content too large", { status: 413 });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
        "Content-Length": buffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("image-proxy error for", url, err);
    return new NextResponse("Proxy error", { status: 502 });
  }
}
