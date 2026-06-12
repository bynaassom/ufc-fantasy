import { listBadges, listUserBadges, awardBadge } from "@/server/repositories/badges";
import { getPublicProfileStats } from "@/server/services/app";
import type { BadgeWithStatus, PublicProfileStats } from "@/types";

type BadgeCriteria = {
  slug: string;
  check: (stats: PublicProfileStats & { totalPerfectPicks: number; maxPerfectPicksInEvent: number }) => boolean;
};

const CRITERIA: BadgeCriteria[] = [
  {
    slug: "primeiro_pick",
    check: (stats) => stats.total_picks >= 1,
  },
  {
    slug: "veterano",
    check: (stats) => stats.events_played >= 10,
  },
  {
    slug: "viciado",
    check: (stats) => stats.events_played >= 25,
  },
  {
    slug: "mira_sniper",
    check: (stats) => stats.maxPerfectPicksInEvent >= 3,
  },
  {
    slug: "mestre_palpites",
    check: (stats) => stats.totalPerfectPicks >= 10,
  },
  {
    slug: "vidente",
    check: (stats) => stats.pick_accuracy >= 70,
  },
  {
    slug: "em_frente",
    check: (stats) => stats.best_streak >= 3,
  },
  {
    slug: "gladiador",
    check: (stats) => stats.challenges_won >= 5,
  },
  {
    slug: "invicto",
    check: (stats) => stats.challenges_won >= 10,
  },
  {
    slug: "campeao_desafios",
    check: (stats) => stats.challenges_won >= 25,
  },
];

export async function evaluateAndGetBadges(
  client: any,
  userId: string,
): Promise<BadgeWithStatus[]> {
  const [badges, userBadges, stats, eventScoresResult] = await Promise.all([
    listBadges(client),
    listUserBadges(client, userId),
    getPublicProfileStats(client, userId),
    client
      .from("event_scores")
      .select("perfect_picks")
      .eq("user_id", userId),
  ]);

  const existingBadgeIds = new Set(userBadges.map((ub) => ub.badge_id));
  const existingBySlug = new Map(
    userBadges.filter((ub) => ub.badge).map((ub) => [ub.badge!.slug, ub]),
  );
  const badgeById = new Map(badges.map((b) => [b.id, b]));

  const totalPerfectPicks = ((eventScoresResult.data || []) as any[])
    .reduce((sum: number, row: any) => sum + Number(row.perfect_picks || 0), 0);
  const maxPerfectPicksInEvent = ((eventScoresResult.data || []) as any[])
    .reduce((max: number, row: any) => Math.max(max, Number(row.perfect_picks || 0)), 0);

  const extendedStats = { ...stats, totalPerfectPicks, maxPerfectPicksInEvent };

  const newlyAwarded: string[] = [];

  for (const badge of badges) {
    if (existingBadgeIds.has(badge.id)) continue;

    const criteria = CRITERIA.find((c) => c.slug === badge.slug);
    if (criteria && criteria.check(extendedStats)) {
      const result = await awardBadge(client, userId, badge.id);
      if (result) {
        existingBadgeIds.add(badge.id);
        existingBySlug.set(badge.slug, result);
        newlyAwarded.push(badge.slug);
      }
    }
  }

  return badges.map((badge) => {
    const userBadge = existingBySlug.get(badge.slug);
    return {
      ...badge,
      unlocked: !!userBadge,
      unlocked_at: userBadge?.unlocked_at || undefined,
    };
  });
}
