import { namesMatch } from "@/lib/ufc-results-sync";
import type { ScrapedCardFight } from "@/lib/ufc-card-sync";

export type CardVerificationWindow = "t72" | "t18";

export type VerificationFight = {
  id: string;
  fighter_a: { name?: string | null } | null;
  fighter_b: { name?: string | null } | null;
  card_type?: string | null;
  fight_order?: number | null;
  weight_class?: string | null;
  is_title_fight?: boolean | null;
  total_rounds?: number | null;
  ufc_matchup_url?: string | null;
};

export type SherdogFight = {
  fighter_a_name: string;
  fighter_b_name: string;
  is_main_event: boolean;
  weight_class: string;
};

type FightChange = { from: unknown; to: unknown };

export type VerifiedCardPlan = {
  added: ScrapedCardFight[];
  updated: Array<{
    fight_id: string;
    fight_name: string;
    changes: Record<string, FightChange>;
  }>;
  removed: Array<{ fight_id: string; fight_name: string }>;
  alerts: string[];
};

const SHERDOG_BASE_URL = "https://www.sherdog.com";
const WINDOW_HOURS: Array<{ window: CardVerificationWindow; hours: number }> = [
  { window: "t72", hours: 72 },
  { window: "t18", hours: 18 },
];

function stripTags(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value: string) {
  return stripTags(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fightName(fight: VerificationFight | ScrapedCardFight) {
  return `${fight.fighter_a?.name || ""} vs ${fight.fighter_b?.name || ""}`.trim();
}

function fightMatches(
  left: Pick<VerificationFight, "fighter_a" | "fighter_b">,
  right: SherdogFight | ScrapedCardFight,
) {
  const leftA = left.fighter_a?.name || "";
  const leftB = left.fighter_b?.name || "";
  const rightA = "fighter_a_name" in right ? right.fighter_a_name : right.fighter_a.name;
  const rightB = "fighter_b_name" in right ? right.fighter_b_name : right.fighter_b.name;

  return (
    (namesMatch(leftA, rightA) && namesMatch(leftB, rightB)) ||
    (namesMatch(leftA, rightB) && namesMatch(leftB, rightA))
  );
}

export function getDueCardVerificationWindow({
  picksLockAt,
  now,
  completedScheduledFors,
}: {
  picksLockAt: string;
  now: Date;
  completedScheduledFors: string[];
}) {
  const lockTime = new Date(picksLockAt).getTime();
  if (!Number.isFinite(lockTime) || now.getTime() >= lockTime) return null;

  const completed = new Set(
    completedScheduledFors.map((value) => new Date(value).toISOString()),
  );
  const latestCompletedTime = Math.max(
    0,
    ...Array.from(completed).map((value) => new Date(value).getTime()),
  );

  const due = WINDOW_HOURS.map(({ window, hours }) => ({
    window,
    scheduledFor: new Date(lockTime - hours * 60 * 60 * 1000).toISOString(),
  }))
    .filter(
      ({ scheduledFor }) =>
        new Date(scheduledFor).getTime() <= now.getTime() &&
        new Date(scheduledFor).getTime() > latestCompletedTime &&
        !completed.has(scheduledFor),
    )
    .sort(
      (left, right) =>
        new Date(right.scheduledFor).getTime() - new Date(left.scheduledFor).getTime(),
    );

  return due[0] || null;
}

export function pickSherdogEventUrl(upcomingHtml: string, eventName: string) {
  const wantedTokens = new Set(
    normalize(eventName)
      .split(" ")
      .filter((token) => token.length >= 4 && !["fight", "night", "ufc"].includes(token)),
  );

  const candidates = Array.from(
    upcomingHtml.matchAll(/<a[^>]+href=["']([^"']*\/events\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
  ).map((match) => {
    const label = normalize(match[2]);
    const score = Array.from(wantedTokens).filter((token) => label.includes(token)).length;
    const href = match[1].startsWith("http") ? match[1] : `${SHERDOG_BASE_URL}${match[1]}`;
    return { href, score };
  });

  return candidates.sort((left, right) => right.score - left.score)[0]?.score
    ? candidates.sort((left, right) => right.score - left.score)[0].href
    : null;
}

export function parseSherdogEventCardHtml(html: string): SherdogFight[] {
  const fights: SherdogFight[] = [];
  const positions = Array.from(html.matchAll(/itemprop=["']subEvent["']/gi)).map(
    (match) => match.index || 0,
  );

  positions.forEach((start, index) => {
    const block = html.slice(start, positions[index + 1] ?? html.length);
    const matchup =
      block.match(/<meta[^>]+itemprop=["']name["'][^>]+content=["']([^"']+\s+vs\.?\s+[^"']+)["']/i)?.[1] ||
      "";
    const performerNames = Array.from(
      block.matchAll(/<span[^>]+itemprop=["']name["'][^>]*>([\s\S]*?)<\/span>/gi),
    )
      .map((match) => stripTags(match[1]))
      .filter(Boolean);
    const names = matchup
      ? matchup.split(/\s+vs\.?\s+/i).map(stripTags)
      : performerNames.slice(0, 2);
    if (names.length < 2) return;

    fights.push({
      fighter_a_name: names[0],
      fighter_b_name: names[1],
      is_main_event: /<b>\s*MAIN EVENT\s*<\/b>/i.test(block),
      weight_class: stripTags(
        block.match(/class=["'][^"']*weight_class[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|td)>/i)?.[1] ||
          "",
      ),
    });
  });

  return fights;
}

function addChange(
  changes: Record<string, FightChange>,
  key: string,
  from: unknown,
  to: unknown,
) {
  if (from !== to) changes[key] = { from, to };
}

export function buildVerifiedCardPlan({
  window,
  currentFights,
  ufcFights,
  sherdogFights,
  sherdogAvailable = true,
}: {
  window: CardVerificationWindow;
  currentFights: VerificationFight[];
  ufcFights: ScrapedCardFight[];
  sherdogFights: SherdogFight[];
  sherdogAvailable?: boolean;
}): VerifiedCardPlan {
  const plan: VerifiedCardPlan = { added: [], updated: [], removed: [], alerts: [] };
  if (!sherdogAvailable) {
    plan.alerts.push("Sherdog indisponível; nenhuma alteração automática aplicada");
    return plan;
  }

  for (const ufcFight of ufcFights) {
    const current = currentFights.find((fight) => fightMatches(fight, ufcFight));
    const sherdog = sherdogFights.find((fight) => fightMatches(ufcFight, fight));
    const label = fightName(ufcFight);

    if (!sherdog) {
      plan.alerts.push(`${label}: luta não confirmada no Sherdog`);
      if (current && current.total_rounds !== ufcFight.total_rounds) {
        plan.alerts.push(`${label}: mudança de rounds sem confirmação`);
      }
      if (current?.is_title_fight && !ufcFight.is_title_fight) {
        plan.alerts.push(`${label}: remoção de cinturão sem confirmação`);
      }
      continue;
    }

    if (!current) {
      plan.added.push(ufcFight);
      continue;
    }

    const changes: Record<string, FightChange> = {};
    addChange(changes, "weight_class", current.weight_class || "", ufcFight.weight_class);
    addChange(changes, "card_type", current.card_type || "", ufcFight.card_type);
    addChange(changes, "fight_order", current.fight_order || 0, ufcFight.fight_order);
    addChange(
      changes,
      "ufc_matchup_url",
      current.ufc_matchup_url || null,
      ufcFight.ufc_matchup_url,
    );

    if (ufcFight.is_title_fight) {
      addChange(changes, "is_title_fight", current.is_title_fight || false, true);
    } else if (current.is_title_fight) {
      plan.alerts.push(`${label}: remoção de cinturão sem confirmação`);
    }

    const roundsConfirmed =
      (ufcFight.total_rounds === 5 && sherdog.is_main_event) ||
      (ufcFight.total_rounds === 3 && !sherdog.is_main_event && !current.is_title_fight);
    if (roundsConfirmed) {
      addChange(changes, "total_rounds", current.total_rounds || 0, ufcFight.total_rounds);
    } else if (current.total_rounds !== ufcFight.total_rounds) {
      plan.alerts.push(`${label}: mudança de rounds sem confirmação`);
    }

    if (Object.keys(changes).length) {
      plan.updated.push({ fight_id: current.id, fight_name: label, changes });
    }
  }

  for (const current of currentFights) {
    const inUfc = ufcFights.some((fight) => fightMatches(current, fight));
    const inSherdog = sherdogFights.some((fight) => fightMatches(current, fight));
    if (inUfc || inSherdog) continue;

    const label = fightName(current);
    if (window === "t18") {
      plan.removed.push({ fight_id: current.id, fight_name: label });
    } else {
      plan.alerts.push(`${label}: ausente nas duas fontes; remoção aguardando T-18h`);
    }
  }

  return plan;
}

export async function scrapeSherdogEventCard(eventName: string) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml",
  };
  const upcomingResponse = await fetch(`${SHERDOG_BASE_URL}/events/upcoming`, {
    headers,
    cache: "no-store",
  });
  if (!upcomingResponse.ok) {
    throw new Error(`Sherdog upcoming HTTP ${upcomingResponse.status}`);
  }

  const eventUrl = pickSherdogEventUrl(await upcomingResponse.text(), eventName);
  if (!eventUrl) throw new Error("Evento não encontrado no Sherdog");

  const eventResponse = await fetch(eventUrl, { headers, cache: "no-store" });
  if (!eventResponse.ok) throw new Error(`Sherdog event HTTP ${eventResponse.status}`);

  const fights = parseSherdogEventCardHtml(await eventResponse.text());
  if (!fights.length) throw new Error("Nenhuma luta encontrada no Sherdog");
  return { eventUrl, fights };
}

export async function inspectUfcStatsEventCard(url?: string | null) {
  if (!url) return { available: false, fightCount: 0, reason: "URL não configurada" };

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    const html = await response.text();
    if (!response.ok) {
      return { available: false, fightCount: 0, reason: `HTTP ${response.status}` };
    }
    if (/checking your browser|cf-browser-verification|challenge-platform/i.test(html)) {
      return { available: false, fightCount: 0, reason: "desafio de navegador" };
    }

    const fightCount = (html.match(/class=["'][^"']*b-fight-details__table-row[^"']*b-fight-details__table-row__hover/gi) || [])
      .length;
    return { available: true, fightCount, reason: null };
  } catch (error) {
    return {
      available: false,
      fightCount: 0,
      reason: error instanceof Error ? error.message : "falha desconhecida",
    };
  }
}
