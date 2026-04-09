import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin-audit";
import { assertSameOriginForMutation } from "@/server/api";

const ODDS_API_KEY = process.env.ODDS_API_KEY!;
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

function namesMatch(apiName: string, dbName: string): boolean {
  const a = normalize(apiName);
  const b = normalize(dbName);
  if (a === b) return true;
  const partsA = apiName.toLowerCase().split(" ").filter(Boolean);
  const partsB = dbName.toLowerCase().split(" ").filter(Boolean);
  const lastA = partsA[partsA.length - 1];
  const lastB = partsB[partsB.length - 1];
  if (lastA !== lastB) return false;
  const firstA = partsA[0];
  const firstB = partsB[0];
  return firstA?.[0] === firstB?.[0];
}

function formatOdds(price: number): string {
  if (price >= 0) return `+${price}`;
  return `${price}`;
}

async function requireAdmin() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role, is_banned")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.is_banned) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { adminSupabase, userId: user.id };
}

async function parseBody(req: NextRequest) {
  try {
    const body = await req.json();
    return {
      dryRun: body?.dry_run === true,
      eventId: typeof body?.event_id === "string" ? body.event_id : undefined,
    };
  } catch {
    return { dryRun: false, eventId: undefined };
  }
}

async function buildOddsPreview(
  adminSupabase: Awaited<ReturnType<typeof createAdminClient>>,
  eventId?: string,
) {
  const eventsQuery = adminSupabase
    .from("events")
    .select("id, name, slug, status")
    .in("status", ["upcoming", "live"])
    .order("event_date");

  const { data: events, error: eventsError } = eventId
    ? await eventsQuery.eq("id", eventId)
    : await eventsQuery;

  if (eventsError || !events?.length) {
    throw new Error("Nenhum evento upcoming/live encontrado");
  }

  const oddsRes = await fetch(
    `${ODDS_API_BASE}/sports/mma_mixed_martial_arts/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h&oddsFormat=american`,
    { next: { revalidate: 0 } },
  );

  if (!oddsRes.ok) {
    const txt = await oddsRes.text();
    throw new Error(`Odds API error: ${oddsRes.status} — ${txt}`);
  }

  const oddsData: OddsEvent[] = await oddsRes.json();
  const remaining = oddsRes.headers.get("x-requests-remaining");

  const eventIds = events.map((event) => event.id);
  const { data: fights } = await adminSupabase
    .from("fights")
    .select(
      `
        id, event_id, odds_a, odds_b,
        event:events!inner(name),
        fighter_a:fighters!fighter_a_id(id, name),
        fighter_b:fighters!fighter_b_id(id, name)
      `,
    )
    .in("event_id", eventIds);

  if (!fights?.length) {
    throw new Error("Nenhuma luta encontrada nos eventos");
  }

  const matches: OddsPreviewItem[] = [];
  const skipped: OddsSkippedItem[] = [];
  const updates: { id: string; odds_a: string | null; odds_b: string | null }[] = [];

  for (const fight of fights) {
    const fa = (fight.fighter_a as any)?.name as string;
    const fb = (fight.fighter_b as any)?.name as string;
    const currentOddsA = fight.odds_a || null;
    const currentOddsB = fight.odds_b || null;
    const eventName = (fight.event as any)?.name as string;

    if (!fa || !fb) {
      skipped.push({
        fight_id: fight.id,
        fight_label: `${fa || "?"} vs ${fb || "?"}`,
        event_name: eventName,
        reason: "Lutadores incompletos na base",
      });
      continue;
    }

    const oddsEvent = oddsData.find((oe) => {
      const allNames =
        oe.bookmakers?.flatMap(
          (bk) => bk.markets?.flatMap((m) => m.outcomes.map((o) => o.name)) ?? [],
        ) ?? [];
      return (
        allNames.some((name) => namesMatch(name, fa)) &&
        allNames.some((name) => namesMatch(name, fb))
      );
    });

    if (!oddsEvent) {
      skipped.push({
        fight_id: fight.id,
        fight_label: `${fa} vs ${fb}`,
        event_name: eventName,
        reason: "Sem match na Odds API",
      });
      continue;
    }

    const bookmaker =
      oddsEvent.bookmakers?.find((bk) => bk.key === "draftkings") ||
      oddsEvent.bookmakers?.find((bk) => bk.key === "fanduel") ||
      oddsEvent.bookmakers?.[0];

    if (!bookmaker) {
      skipped.push({
        fight_id: fight.id,
        fight_label: `${fa} vs ${fb}`,
        event_name: eventName,
        reason: "Evento sem bookmaker válido",
      });
      continue;
    }

    const market = bookmaker.markets?.find((item) => item.key === "h2h");
    if (!market) {
      skipped.push({
        fight_id: fight.id,
        fight_label: `${fa} vs ${fb}`,
        event_name: eventName,
        reason: "Bookmaker sem mercado h2h",
      });
      continue;
    }

    const outcomeA = market.outcomes.find((outcome) => namesMatch(outcome.name, fa));
    const outcomeB = market.outcomes.find((outcome) => namesMatch(outcome.name, fb));
    const nextOddsA = outcomeA ? formatOdds(outcomeA.price) : null;
    const nextOddsB = outcomeB ? formatOdds(outcomeB.price) : null;

    const changed = currentOddsA !== nextOddsA || currentOddsB !== nextOddsB;
    matches.push({
      fight_id: fight.id,
      event_name: eventName,
      fight_label: `${fa} vs ${fb}`,
      bookmaker: bookmaker.title,
      current_odds_a: currentOddsA,
      current_odds_b: currentOddsB,
      next_odds_a: nextOddsA,
      next_odds_b: nextOddsB,
      changed,
    });

    if (changed) {
      updates.push({
        id: fight.id,
        odds_a: nextOddsA,
        odds_b: nextOddsB,
      });
    }
  }

  return {
    matches,
    skipped,
    updates,
    requestsRemaining: remaining,
  };
}

export async function POST(req: NextRequest) {
  assertSameOriginForMutation(req);
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  if (!ODDS_API_KEY) {
    return NextResponse.json(
      { error: "ODDS_API_KEY não configurada" },
      { status: 500 },
    );
  }

  const { dryRun, eventId } = await parseBody(req);

  try {
    const preview = await buildOddsPreview(auth.adminSupabase, eventId);
    const changedMatches = preview.matches.filter((item) => item.changed);

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dry_run: true,
        message: `${changedMatches.length} luta(s) com mudança de odds, ${preview.skipped.length} sem match`,
        requests_remaining: preview.requestsRemaining,
        matches: preview.matches,
        skipped: preview.skipped,
      });
    }

    let saved = 0;
    for (const update of preview.updates) {
      const { error } = await auth.adminSupabase
        .from("fights")
        .update({ odds_a: update.odds_a, odds_b: update.odds_b })
        .eq("id", update.id);
      if (!error) saved++;
    }

    await logAdminAction(auth.adminSupabase, {
      userId: auth.userId,
      action: "admin_sync_odds",
      details: {
        event_id: eventId || null,
        changed_count: changedMatches.length,
        saved_count: saved,
        skipped_count: preview.skipped.length,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `${saved} luta(s) atualizadas, ${preview.skipped.length} sem match`,
      requests_remaining: preview.requestsRemaining,
      matches: preview.matches,
      skipped: preview.skipped,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

interface OddsPreviewItem {
  fight_id: string;
  event_name: string;
  fight_label: string;
  bookmaker: string;
  current_odds_a: string | null;
  current_odds_b: string | null;
  next_odds_a: string | null;
  next_odds_b: string | null;
  changed: boolean;
}

interface OddsSkippedItem {
  fight_id: string;
  event_name: string;
  fight_label: string;
  reason: string;
}

interface OddsEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  outcomes?: { name: string }[];
  bookmakers?: {
    key: string;
    title: string;
    markets: {
      key: string;
      outcomes: { name: string; price: number }[];
    }[];
  }[];
}
