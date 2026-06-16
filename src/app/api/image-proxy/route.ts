import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  if (!/^https?:\/\//i.test(url))
    return new NextResponse("Invalid url", { status: 400 });

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok)
      return new NextResponse("Fetch failed", { status: resp.status });

    const buffer = await resp.arrayBuffer();
    const contentType =
      resp.headers.get("content-type") || "image/jpeg";

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
