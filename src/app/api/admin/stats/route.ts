export const dynamic = "force-dynamic";

import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { requireAdmin } from "@/server/auth/guards";

export async function GET() {
  try {
    const { adminSupabase } = await requireAdmin();

    const [
      { count: totalUsers },
      { count: totalEvents },
      { count: totalPicks },
      { count: totalChallenges },
      { count: totalGroups },
      { count: totalChatMessages },
      { count: activeUsers },
      { count: picksThisEvent },
    ] = await Promise.all([
      adminSupabase.from("profiles").select("*", { count: "exact", head: true }),
      adminSupabase.from("events").select("*", { count: "exact", head: true }),
      adminSupabase.from("picks").select("*", { count: "exact", head: true }),
      adminSupabase.from("challenges").select("*", { count: "exact", head: true }),
      adminSupabase.from("groups").select("*", { count: "exact", head: true }),
      adminSupabase.from("chat_messages").select("*", { count: "exact", head: true }),
      adminSupabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      adminSupabase
        .from("picks")
        .select("*", { count: "exact", head: true })
        .eq("event_id", (
          await adminSupabase
            .from("events")
            .select("id")
            .eq("status", "live")
            .limit(1)
            .maybeSingle()
        ).data?.id || ""),
    ]);

    return apiSuccess({
      stats: {
        total_users: totalUsers || 0,
        total_events: totalEvents || 0,
        total_picks: totalPicks || 0,
        total_challenges: totalChallenges || 0,
        total_groups: totalGroups || 0,
        total_chat_messages: totalChatMessages || 0,
        active_users_last_7d: activeUsers || 0,
        picks_this_event: picksThisEvent || 0,
      },
    });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
