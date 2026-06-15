import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  try {
    const resp = await fetch(url);
    if (!resp.ok) return new NextResponse("Fetch failed", { status: resp.status });

    const blob = await resp.blob();
    const headers = new Headers(resp.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cache-Control", "public, max-age=86400");

    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  }
}
