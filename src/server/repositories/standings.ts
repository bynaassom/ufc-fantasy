import type { GroupSeasonStandingEntry, Season, SeasonStandingEntry } from "@/types";

export async function getCurrentSeason(client: any): Promise<Season | null> {
  const { data, error } = await client
    .from("seasons")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();

  if (error) throw error;
  return data as Season | null;
}

export async function listSeasons(client: any): Promise<Season[]> {
  const { data, error } = await client
    .from("seasons")
    .select("*")
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Season[];
}

export async function listGlobalSeasonStandings(
  client: any,
  seasonId: string,
  limit = 100,
): Promise<SeasonStandingEntry[]> {
  const { data, error } = await client
    .from("global_season_standings")
    .select("*")
    .eq("season_id", seasonId)
    .order("rank_position", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []) as SeasonStandingEntry[];
}

export async function listGroupSeasonStandings(
  client: any,
  groupId: string,
  seasonId: string,
): Promise<GroupSeasonStandingEntry[]> {
  const { data, error } = await client
    .from("group_season_standings")
    .select("*")
    .eq("group_id", groupId)
    .eq("season_id", seasonId)
    .order("rank_position", { ascending: true });

  if (error) throw error;
  return (data || []) as GroupSeasonStandingEntry[];
}
