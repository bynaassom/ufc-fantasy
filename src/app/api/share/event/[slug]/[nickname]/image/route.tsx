import { ImageResponse } from "next/og";
import { getPublicEventResultShareData } from "@/server/services/app";
import { inlineImageDataUrl } from "@/lib/server/inline-image";
import { renderResultShareCardImage, SHARE_IMAGE_SIZE } from "@/lib/server/share-card-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: {
    slug: string;
    nickname: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const data = await getPublicEventResultShareData(params.slug, params.nickname);
  if (!data) return new Response("Not found", { status: 404 });

  const bannerDataUrl = await inlineImageDataUrl(data.event.banner_image_url);

  return new ImageResponse(
    renderResultShareCardImage(data, bannerDataUrl || data.event.banner_image_url),
    {
      ...SHARE_IMAGE_SIZE,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
}
