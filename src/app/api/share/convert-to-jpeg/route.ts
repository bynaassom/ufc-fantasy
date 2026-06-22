import { pngBufferToJpegBuffer } from "@/lib/server/png-to-jpeg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PNG_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("image/png")) {
    return new Response("Expected image/png", { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength && contentLength > MAX_PNG_BYTES) {
    return new Response("Image too large", { status: 413 });
  }

  const png = await request.arrayBuffer();
  if (!png.byteLength) return new Response("Empty image", { status: 400 });
  if (png.byteLength > MAX_PNG_BYTES) return new Response("Image too large", { status: 413 });

  const jpg = pngBufferToJpegBuffer(png);
  return new Response(new Uint8Array(jpg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(jpg.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
