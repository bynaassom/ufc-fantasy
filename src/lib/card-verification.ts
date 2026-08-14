import { namesMatch, type UfcStatsCardFight } from "@/lib/ufc-results-sync";
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

const WINDOW_HOURS: Array<{ window: CardVerificationWindow; hours: number }> = [
  { window: "t72", hours: 72 },
  { window: "t18", hours: 18 },
];

function fightName(fight: VerificationFight | ScrapedCardFight) {
  return `${fight.fighter_a?.name || ""} vs ${fight.fighter_b?.name || ""}`.trim();
}

function fightMatches(
  left: Pick<VerificationFight, "fighter_a" | "fighter_b">,
  right: UfcStatsCardFight | ScrapedCardFight,
) {
  const leftA = left.fighter_a?.name || "";
  const leftB = left.fighter_b?.name || "";
  const rightA =
    "fighter_a_name" in right ? right.fighter_a_name : right.fighter_a.name;
  const rightB =
    "fighter_b_name" in right ? right.fighter_b_name : right.fighter_b.name;

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
        new Date(right.scheduledFor).getTime() -
        new Date(left.scheduledFor).getTime(),
    );

  return due[0] || null;
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
  ufcStatsFights,
  ufcStatsAvailable = true,
}: {
  window: CardVerificationWindow;
  currentFights: VerificationFight[];
  ufcFights: ScrapedCardFight[];
  ufcStatsFights: UfcStatsCardFight[];
  ufcStatsAvailable?: boolean;
}): VerifiedCardPlan {
  const plan: VerifiedCardPlan = {
    added: [],
    updated: [],
    removed: [],
    alerts: [],
  };
  if (!ufcStatsAvailable) {
    plan.alerts.push("UFCStats indisponível; nenhuma alteração automática aplicada");
    return plan;
  }

  for (const ufcFight of ufcFights) {
    const current = currentFights.find((fight) => fightMatches(fight, ufcFight));
    const ufcStats = ufcStatsFights.find((fight) => fightMatches(ufcFight, fight));
    const label = fightName(ufcFight);

    if (!ufcStats) {
      plan.alerts.push(`${label}: luta não confirmada no UFCStats`);
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

    addChange(changes, "total_rounds", current.total_rounds || 0, ufcFight.total_rounds);

    if (Object.keys(changes).length) {
      plan.updated.push({ fight_id: current.id, fight_name: label, changes });
    }
  }

  for (const current of currentFights) {
    const inUfc = ufcFights.some((fight) => fightMatches(current, fight));
    const inUfcStats = ufcStatsFights.some((fight) => fightMatches(current, fight));
    if (inUfc || inUfcStats) continue;

    const label = fightName(current);
    if (window === "t18") {
      plan.removed.push({ fight_id: current.id, fight_name: label });
    } else {
      plan.alerts.push(`${label}: ausente nas duas fontes; remoção aguardando T-18h`);
    }
  }

  return plan;
}
