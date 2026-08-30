import { mapMethod, type UfcStatsResult } from "@/lib/ufc-results-sync";
import { getAutomatedEventTiming } from "@/lib/event-timing";

const UFC_LIVE_API_BASE =
  "https://d29dxerjsp82wz.cloudfront.net/api/v3/event/live";

type RawFighter = {
  FighterId?: number | string | null;
  Name?: {
    FirstName?: string | null;
    LastName?: string | null;
  } | null;
  Corner?: string | null;
  Outcome?: {
    Outcome?: string | null;
  } | null;
};

type RawFight = {
  FightId?: number | string | null;
  FightOrder?: number | null;
  Status?: string | null;
  CardSegment?: string | null;
  CardSegmentStartTime?: string | null;
  WeightClass?: {
    Description?: string | null;
    CatchWeight?: number | null;
  } | null;
  Accolades?: Array<{ Type?: string | null; Name?: string | null }> | null;
  RuleSet?: { PossibleRounds?: number | null } | null;
  FightNightTracking?: Array<{
    ActionId?: number | string | null;
    FighterId?: number | string | null;
    Type?: string | null;
    RoundNumber?: number | string | null;
    RoundTime?: string | null;
    Timestamp?: string | null;
  }> | null;
  Fighters?: RawFighter[] | null;
  Result?: {
    Method?: string | null;
    EndingRound?: number | string | null;
  } | null;
};

type RawEventDetail = {
  EventId?: number | string | null;
  Name?: string | null;
  StartTime?: string | null;
  TimeZone?: string | null;
  Status?: string | null;
  FightCard?: RawFight[] | null;
  Location?: {
    Venue?: string | null;
    City?: string | null;
    State?: string | null;
    Country?: string | null;
  } | null;
};

export type UfcLiveEventStatus = "upcoming" | "live" | "completed";
export type UfcFightLivePhase =
  | "upcoming"
  | "walkouts"
  | "introductions"
  | "live"
  | "between_rounds"
  | "awaiting_result"
  | "completed"
  | "unknown";

export type UfcLiveCardFight = {
  fightId: string;
  fightOrder: number;
  status: string;
  cardType: "main" | "preliminary";
  cardSegment: string;
  cardSegmentStartTime: string | null;
  weightClass: string;
  isTitleFight: boolean;
  totalRounds: number;
  phase: UfcFightLivePhase;
  currentRound: number | null;
  roundTime: string | null;
  latestActionAt: string | null;
  fighterA: { id: string; name: string };
  fighterB: { id: string; name: string };
};

export type UfcLiveEvent = {
  eventId: string;
  name: string;
  startTime: string | null;
  timeZone: string | null;
  prelimsStartAt: string | null;
  status: UfcLiveEventStatus;
  location: string;
  fights: UfcLiveCardFight[];
  results: UfcStatsResult[];
};

export type UfcAutomaticTimingUpdate = {
  event_date: string;
  prelims_start_at: string;
  picks_lock_at: string;
  picks_open_at: string;
  status: UfcLiveEventStatus;
};

function toIso(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function fighterName(fighter?: RawFighter | null) {
  return [fighter?.Name?.FirstName, fighter?.Name?.LastName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStatus(status?: string | null): UfcLiveEventStatus {
  const normalized = (status || "").toLowerCase();
  if (/live|in[ _-]?progress|active/.test(normalized)) return "live";
  if (/final|complete|completed|ended|closed/.test(normalized)) return "completed";
  return "upcoming";
}

function isWinningOutcome(outcome?: string | null) {
  return /^(?:w|win|winner)$/i.test((outcome || "").trim());
}

function isLosingOutcome(outcome?: string | null) {
  return /^(?:l|loss|lose|loser)$/i.test((outcome || "").trim());
}

function parseResults(fights: RawFight[]) {
  const results: UfcStatsResult[] = [];

  for (const fight of fights) {
    const fighters = fight.Fighters || [];
    const winner = fighters.find((fighter) =>
      isWinningOutcome(fighter.Outcome?.Outcome),
    );
    const loser = fighters.find((fighter) =>
      isLosingOutcome(fighter.Outcome?.Outcome),
    );
    const method = mapMethod(fight.Result?.Method || "");
    const round = Number(fight.Result?.EndingRound);

    if (!winner || !loser || !method || !Number.isInteger(round) || round < 1) {
      continue;
    }

    const winnerName = fighterName(winner);
    const loserName = fighterName(loser);
    if (!winnerName || !loserName) continue;

    results.push({ winner: winnerName, loser: loserName, method, round });
  }

  return results;
}

function deriveFightLiveState(fight: RawFight) {
  const tracking = [...(fight.FightNightTracking || [])].sort((a, b) => {
    const timeA = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
    const timeB = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return Number(a.ActionId || 0) - Number(b.ActionId || 0);
  });
  const latest = tracking.at(-1);
  const latestType = (latest?.Type || "").toLowerCase();
  const status = (fight.Status || "").toLowerCase();
  const lastRoundAction = [...tracking]
    .reverse()
    .find((action) => Number(action.RoundNumber) > 0);
  const currentRound = Number(lastRoundAction?.RoundNumber);

  let phase: UfcFightLivePhase = "unknown";
  if (/final|complete|completed|ended|closed/.test(status) || latestType === "fight_complete") {
    phase = "completed";
  } else if (/fight_over|unofficial_winner|results/.test(latestType)) {
    phase = "awaiting_result";
  } else if (latestType === "round_end") {
    phase = "between_rounds";
  } else if (/round_start|live|in[ _-]?progress|active/.test(`${latestType} ${status}`)) {
    phase = "live";
  } else if (/tale_of_the_tape|staredown/.test(latestType)) {
    phase = "introductions";
  } else if (/fight_open|walkout/.test(latestType)) {
    phase = "walkouts";
  } else if (/upcoming|scheduled/.test(status) || tracking.length === 0) {
    phase = "upcoming";
  }

  return {
    phase,
    currentRound: Number.isInteger(currentRound) && currentRound > 0
      ? currentRound
      : null,
    roundTime: lastRoundAction?.RoundTime || null,
    latestActionAt: toIso(latest?.Timestamp),
  };
}

function parseCardFight(fight: RawFight): UfcLiveCardFight | null {
  const fighters = fight.Fighters || [];
  if (fighters.length < 2) return null;

  const red = fighters.find((fighter) => /red/i.test(fighter.Corner || ""));
  const blue = fighters.find((fighter) => /blue/i.test(fighter.Corner || ""));
  const fighterA = red || fighters[0];
  const fighterB = blue || fighters.find((fighter) => fighter !== fighterA);
  const fighterAName = fighterName(fighterA);
  const fighterBName = fighterName(fighterB);
  if (!fighterAName || !fighterBName) return null;

  const segment = fight.CardSegment || "";
  const accolades = fight.Accolades || [];
  const isTitleFight = accolades.some(
    (accolade) =>
      /belt|title/i.test(accolade.Type || "") ||
      /belt|title/i.test(accolade.Name || ""),
  );
  const catchWeight = fight.WeightClass?.CatchWeight;
  const weightClass = catchWeight
    ? `Catchweight (${catchWeight} lb)`
    : fight.WeightClass?.Description || "";
  const liveState = deriveFightLiveState(fight);

  return {
    fightId: String(fight.FightId || ""),
    fightOrder: Number(fight.FightOrder) || 0,
    status: fight.Status || "",
    cardType: /^main$/i.test(segment) ? "main" : "preliminary",
    cardSegment: segment,
    cardSegmentStartTime: toIso(fight.CardSegmentStartTime),
    weightClass,
    isTitleFight,
    totalRounds: Number(fight.RuleSet?.PossibleRounds) || (isTitleFight ? 5 : 3),
    ...liveState,
    fighterA: {
      id: String(fighterA?.FighterId || ""),
      name: fighterAName,
    },
    fighterB: {
      id: String(fighterB?.FighterId || ""),
      name: fighterBName,
    },
  };
}

export function extractUfcLiveEventId(html: string) {
  const patterns = [
    /["']event_fmid["']\s*:\s*["']?(\d+)["']?/i,
    /id=["']c-listing-ticker["'][^>]*\bdata-fmid=["'](\d+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function buildUfcLiveEventUrl(eventId: string | number) {
  const normalized = String(eventId).trim();
  if (!/^\d+$/.test(normalized)) throw new Error("ID da API UFC inválido");
  return `${UFC_LIVE_API_BASE}/${normalized}.json`;
}

export function parseUfcLiveEventPayload(payload: unknown): UfcLiveEvent | null {
  const detail = (payload as { LiveEventDetail?: RawEventDetail | null })
    ?.LiveEventDetail;
  if (!detail?.EventId) return null;

  const rawFights = detail.FightCard || [];
  const fights = rawFights
    .map(parseCardFight)
    .filter((fight): fight is UfcLiveCardFight => Boolean(fight));
  const segmentStarts = fights
    .map((fight) => fight.cardSegmentStartTime)
    .filter((value): value is string => Boolean(value))
    .sort();

  const location = [
    detail.Location?.Venue,
    detail.Location?.City,
    detail.Location?.State,
    detail.Location?.Country,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    eventId: String(detail.EventId),
    name: detail.Name?.trim() || "",
    startTime: toIso(detail.StartTime),
    timeZone: detail.TimeZone?.trim() || null,
    prelimsStartAt: segmentStarts[0] || toIso(detail.StartTime),
    status: normalizeStatus(detail.Status),
    location,
    fights,
    results: parseResults(rawFights),
  };
}

export function buildUfcAutomaticTimingUpdate(
  current: {
    timing_mode?: "automatic" | "manual" | null;
    picks_open_at?: string | null;
  },
  official: UfcLiveEvent,
): UfcAutomaticTimingUpdate | null {
  if (current.timing_mode === "manual" || !official.startTime) return null;

  const prelimsStartAt = official.prelimsStartAt || official.startTime;
  const timing = getAutomatedEventTiming({
    event_date: official.startTime,
    prelims_start_at: prelimsStartAt,
  });
  if (!timing) return null;

  return {
    event_date: official.startTime,
    prelims_start_at: prelimsStartAt,
    picks_lock_at: timing.picksLockAt,
    picks_open_at: current.picks_open_at || timing.picksOpenAt,
    status: official.status,
  };
}

export async function fetchUfcLiveEvent(
  eventId: string | number,
  options: { signal?: AbortSignal } = {},
) {
  const url = buildUfcLiveEventUrl(eventId);
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: options.signal,
  });
  if (!response.ok) throw new Error(`UFC API HTTP ${response.status}`);

  const event = parseUfcLiveEventPayload(await response.json());
  if (!event) throw new Error("Resposta inválida da API oficial do UFC");
  return { url, event };
}

export async function fetchUfcLiveEventFromPage(
  pageUrl: string,
  options: { signal?: AbortSignal } = {},
) {
  const pageResponse = await fetch(pageUrl, {
    cache: "no-store",
    headers: { Accept: "text/html,application/xhtml+xml" },
    signal: options.signal,
  });
  if (!pageResponse.ok) throw new Error(`UFC.com HTTP ${pageResponse.status}`);

  const eventId = extractUfcLiveEventId(await pageResponse.text());
  if (!eventId) throw new Error("ID da API oficial não encontrado no UFC.com");
  return fetchUfcLiveEvent(eventId, options);
}
