import { pngBufferToJpegBuffer } from "@/lib/server/png-to-jpeg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("image/png")) {
    return new Response("Expected image/png", { status: 415 });
  }

  const png = await request.arrayBuffer();
  if (!png.byteLength) return new Response("Empty image", { status: 400 });

  const jpg = pngBufferToJpegBuffer(png);
  return new Response(new Uint8Array(jpg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(jpg.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
