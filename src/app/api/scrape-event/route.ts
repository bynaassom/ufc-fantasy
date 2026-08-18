export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { parseUfcEventCardHtml } from "@/lib/ufc-card-sync";
import { extractUfcEventBannerUrl } from "@/lib/ufc-api";
import { isAllowedScrapeUrl } from "@/lib/security";
import { assertSameOriginForMutation } from "@/server/api";

function extractText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  assertSameOriginForMutation(req);
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role, is_banned")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin" || profile.is_banned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });
  }
  if (!isAllowedScrapeUrl(url)) {
    return NextResponse.json({ error: "Host não permitido para scraping" }, { status: 400 });
  }

  let html = "";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    return NextResponse.json({ error: `Falha ao buscar URL: ${err}` }, { status: 400 });
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawTitle = titleMatch?.[1]?.trim() || "";
  const eventName = rawTitle.replace(/\s*[|\-]\s*UFC.*$/i, "").trim() || rawTitle;

  const dateMatches = Array.from(
    html.matchAll(
      /(\d{2})\.(\d{2})\.(\d{2})\s*\/\s*(\d{1,2}):(\d{2})\s*(EDT|EST|UTC)?/gi,
    ),
  );
  let event_date = "";
  let picks_lock_at = "";

  if (dateMatches.length > 0) {
    const last = dateMatches[dateMatches.length - 1];
    const [, day, month, year, hour, min, tz] = last;
    const offset = tz?.toUpperCase() === "EST" ? 5 : 4;
    let utcHour = parseInt(hour, 10) + offset;
    let utcDay = parseInt(day, 10);
    let utcMonth = parseInt(month, 10);
    let utcYear = 2000 + parseInt(year, 10);

    if (utcHour >= 24) {
      utcHour -= 24;
      utcDay += 1;
      const normalizedDate = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay));
      utcYear = normalizedDate.getUTCFullYear();
      utcMonth = normalizedDate.getUTCMonth() + 1;
      utcDay = normalizedDate.getUTCDate();
    }

    const pad = (value: number) => String(value).padStart(2, "0");
    event_date = `${utcYear}-${pad(utcMonth)}-${pad(utcDay)}T${pad(utcHour)}:${min}:00Z`;

    const lockDate = new Date(event_date);
    lockDate.setMinutes(lockDate.getMinutes() - 30);
    picks_lock_at = lockDate.toISOString();
  }

  const locationMatch = html.match(
    /(?:O2 Arena|APEX|Arena|Center|Centre|Stadium|Garden|Coliseum|Climate Pledge)[^<,\n]*/i,
  );
  const location = locationMatch ? extractText(locationMatch[0]) : "";

  const banner_image_url = extractUfcEventBannerUrl(html) || "";

  return NextResponse.json({
    event: {
      name: eventName,
      event_date,
      picks_lock_at,
      location,
      banner_image_url,
    },
    fights: parseUfcEventCardHtml(html, url),
  });
}
