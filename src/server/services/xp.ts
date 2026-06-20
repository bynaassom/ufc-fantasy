import type { XpEvent, XpEventMetadata, XpSummary } from "@/types";
import { getServiceRoleSupabase } from "@/lib/supabase/service-role";
import {
  insertXpEvent,
  listXpEventsForUser,
  incrementProfileXp,
  updateProfileStreak,
  updateProfileLevel,
} from "@/server/repositories/xp";
import { levelFromXp, titleFromLevel, xpToNextLevel } from "@/lib/level-titles";
import { logActivity } from "@/server/services/activity";
import { notifyEventRecapReady, notifyLevelUp } from "@/server/services/notifications";

const XP_REASON = "event_completion";

export async function computeEventXpForUser(
  client: any,
  userId: string,
  eventId: string,
): Promise<{ amount: number; metadata: XpEventMetadata } | null> {
  const { data: picks, error: picksErr } = await client
    .from("event_picks")
    .select("fight_id, winner_id, method, round, points_winner, points_method, points_round")
    .eq("user_id", userId)
    .eq("event_id", eventId);

  if (picksErr) throw picksErr;
  if (!picks || picks.length === 0) return null;

  let correctWinners = 0;
  let correctMethods = 0;
  let correctRounds = 0;
  for (const p of picks) {
    if ((p.points_winner ?? 0) > 0) correctWinners++;
    if ((p.points_method ?? 0) > 0) correctMethods++;
    if ((p.points_round ?? 0) > 0) correctRounds++;
  }

  const n = picks.length;
  const accuracy = correctWinners / n;
  const methodAcc = correctMethods / n;
  const roundAcc = correctRounds / n;

  const amount = Math.round(100 + 50 * accuracy + 25 * methodAcc + 25 * roundAcc);

  return {
    amount,
    metadata: {
      accuracy,
      method_acc: methodAcc,
      round_acc: roundAcc,
      fights_with_picks: n,
      correct_winners: correctWinners,
      correct_methods: correctMethods,
      correct_rounds: correctRounds,
    },
  };
}

export async function awardEventXpForAllUsers(eventId: string): Promise<{
  awarded: number;
  usersAffected: string[];
}> {
  const admin: any = await getServiceRoleSupabase();

  const { data: eventData } = await admin
    .from("events")
    .select("name, slug")
    .eq("id", eventId)
    .single();
  const eventName = eventData?.name || "—";
  const eventSlug = eventData?.slug || "—";

  const { data: pickers, error: pickersErr } = await admin
    .from("event_picks")
    .select("user_id")
    .eq("event_id", eventId);

  if (pickersErr) throw pickersErr;
  if (!pickers || pickers.length === 0) return { awarded: 0, usersAffected: [] };

  const userIds: string[] = Array.from(new Set((pickers as Array<{ user_id: string }>).map((p) => p.user_id)));
  const usersAffected: string[] = [];
  let awarded = 0;

  for (const userId of userIds) {
    try {
      const computed = await computeEventXpForUser(admin, userId, eventId);
      if (!computed) continue;
      const inserted = await insertXpEvent(admin, {
        userId,
        eventId,
        amount: computed.amount,
        reason: XP_REASON,
        metadata: computed.metadata,
      });
      if (!inserted) continue;
      await incrementProfileXp(admin, userId, computed.amount);

      try {
        await logActivity(userId, "result_scored", {
          eventName,
          eventSlug,
          correctWinners: computed.metadata.correct_winners,
          totalFights: computed.metadata.fights_with_picks,
          xpEarned: computed.amount,
        });
      } catch { /* silent */ }

      usersAffected.push(userId);
      awarded++;
    } catch (err) {
      await admin.from("activity_logs").insert({
        user_id: null,
        action: "xp_compute_failed",
        details: { eventId, userId, error: String(err) },
        suspicious: false,
      });
    }
  }

  for (const userId of usersAffected) {
    try {
      const streakResult = await recomputeStreakAndLevelForUser(userId);

      try {
        if ([3, 5, 10, 25].includes(streakResult.currentStreak)) {
          await logActivity(userId, "streak_milestone", {
            currentStreak: streakResult.currentStreak,
            bestStreak: streakResult.bestStreak,
          });
        }
        if (streakResult.newLevel > streakResult.oldLevel) {
          await logActivity(userId, "level_up", {
            newLevel: streakResult.newLevel,
            levelTitle: titleFromLevel(streakResult.newLevel),
          });
          try {
            await notifyLevelUp(userId, streakResult.newLevel);
          } catch { /* silent */ }
        }
      } catch { /* silent */ }
    } catch (err) {
      await admin.from("activity_logs").insert({
        user_id: null,
        action: "xp_streak_recompute_failed",
        details: { userId, error: String(err) },
        suspicious: false,
      });
    }
  }

  for (const userId of usersAffected) {
    try {
      await notifyEventRecapReady(userId, eventName, eventSlug);
    } catch { /* silent */ }
  }

  return { awarded, usersAffected };
}

export async function recomputeStreakAndLevelForUser(userId: string): Promise<{
  oldLevel: number;
  newLevel: number;
  currentStreak: number;
  bestStreak: number;
}> {
  const admin: any = await getServiceRoleSupabase();
  const events = await listXpEventsForUser(admin, userId, 100);

  let currentStreak = 0;
  for (const ev of events) {
    if (ev.metadata.accuracy >= 0.7) currentStreak++;
    else break;
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("xp_total, best_streak, level")
    .eq("id", userId)
    .single();
  if (error) throw error;

  const bestStreak = Math.max(currentStreak, profile.best_streak);
  const newLevel = levelFromXp(profile.xp_total);

  await updateProfileStreak(admin, userId, currentStreak, bestStreak);
  if (newLevel !== profile.level) {
    await updateProfileLevel(admin, userId, newLevel);
  }

  return {
    oldLevel: profile.level,
    newLevel,
    currentStreak,
    bestStreak,
  };
}

export async function getProfileXpSummary(userId: string): Promise<XpSummary> {
  const admin: any = await getServiceRoleSupabase();
  const { data, error } = await admin
    .from("profiles")
    .select("xp_total, current_streak, best_streak, level")
    .eq("id", userId)
    .single();
  if (error) throw error;

  const progress = xpToNextLevel(data.xp_total);
  return {
    xpTotal: data.xp_total,
    level: data.level,
    levelTitle: titleFromLevel(data.level),
    currentStreak: data.current_streak,
    bestStreak: data.best_streak,
    nextLevelXp: progress.needed,
    progressToNextLevel: progress.progress,
  };
}

export async function getRecentXpEventsForUser(
  userId: string,
  limit = 10,
): Promise<XpEvent[]> {
  const admin: any = await getServiceRoleSupabase();
  return listXpEventsForUser(admin, userId, limit);
}

export async function getEventXpForUser(
  userId: string,
  eventId: string,
): Promise<XpEvent | null> {
  const admin: any = await getServiceRoleSupabase();
  const { data, error } = await admin
    .from("xp_events")
    .select("*")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .eq("reason", XP_REASON)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as XpEvent) || null;
}
