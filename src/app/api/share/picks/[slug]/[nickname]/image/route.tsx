import { ImageResponse } from "next/og";
import { getPublicEventPickShareData } from "@/server/services/app";
import { inlineImageDataUrl } from "@/lib/server/inline-image";
import { renderPickShareCardImage, SHARE_IMAGE_SIZE } from "@/lib/server/share-card-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: {
    slug: string;
    nickname: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const data = await getPublicEventPickShareData(params.slug, params.nickname);
  if (!data) return new Response("Not found", { status: 404 });

  const bannerDataUrl = await inlineImageDataUrl(data.event.banner_image_url);
  const image = new ImageResponse(
    renderPickShareCardImage(data, bannerDataUrl || data.event.banner_image_url),
    {
      ...SHARE_IMAGE_SIZE,
    },
  );

  const png = await image.arrayBuffer();
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.byteLength),
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
