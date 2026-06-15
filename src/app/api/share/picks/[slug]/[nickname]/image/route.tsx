import { ImageResponse } from "next/og";
import { getPublicEventPickShareData } from "@/server/services/app";
import { pngBufferToJpegBuffer } from "@/lib/server/png-to-jpeg";
import { renderPickShareCardImage, SHARE_IMAGE_SIZE } from "@/lib/server/share-card-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: {
    slug: string;
    nickname: string;
  };
};

export async function GET(request: Request, { params }: Params) {
  const data = await getPublicEventPickShareData(params.slug, params.nickname);
  if (!data) return new Response("Not found", { status: 404 });

  const image = new ImageResponse(
    renderPickShareCardImage(data, data.event.banner_image_url),
    {
      ...SHARE_IMAGE_SIZE,
    },
  );

  const png = await image.arrayBuffer();

  if (new URL(request.url).searchParams.get("format") === "jpg") {
    const jpg = pngBufferToJpegBuffer(png);
    return new Response(new Uint8Array(jpg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(jpg.byteLength),
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  }

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.byteLength),
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
