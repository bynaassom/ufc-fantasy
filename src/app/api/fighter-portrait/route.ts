import { NextRequest, NextResponse } from "next/server";
import {
  getCachedUfcFighterPortrait,
  isValidUfcAthleteSlug,
  UfcPortraitLookupSaturatedError,
} from "@/lib/ufc-fighter-media";

export const dynamic = "force-dynamic";

const SHORT_CACHE = "public, max-age=15, s-maxage=60, stale-while-revalidate=30";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim() ?? "";
  const slug = req.nextUrl.searchParams.get("slug")?.trim() ?? "";

  if (
    name.length < 2 ||
    name.length > 80 ||
    /[<>\u0000-\u001f]/.test(name) ||
    (slug !== "" && !isValidUfcAthleteSlug(slug))
  ) {
    return NextResponse.json(
      { imageUrl: null, fallbackUrl: null },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const portrait = await getCachedUfcFighterPortrait(name, slug || undefined);
    const found = Boolean(portrait.imageUrl);
    return NextResponse.json(portrait, {
      headers: {
        "Cache-Control": found
          ? "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400"
          : SHORT_CACHE,
      },
    });
  } catch (error) {
    // Keep overload retryable and explicit instead of caching an empty portrait.
    // The map entry is never written when the saturation guard rejects.
    if (error instanceof UfcPortraitLookupSaturatedError) {
      return NextResponse.json(
        { imageUrl: null, fallbackUrl: null },
        { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } },
      );
    }
    return NextResponse.json(
      { imageUrl: null, fallbackUrl: null },
      { headers: { "Cache-Control": SHORT_CACHE } },
    );
  }
}
