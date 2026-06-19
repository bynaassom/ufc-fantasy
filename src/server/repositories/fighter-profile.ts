import type { DbClient } from "@/types/database";
import type { Fighter } from "@/types";

export async function findFighterBySlug(
  client: DbClient,
  slug: string,
): Promise<Fighter | null> {
  const { data, error } = await client
    .from("fighters")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Fighter) || null;
}

export async function findFighterById(
  client: DbClient,
  id: string,
): Promise<Fighter | null> {
  const { data, error } = await client
    .from("fighters")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Fighter) || null;
}

export type FighterFormEntry = {
  event_name: string;
  event_date: string;
  opponent_name: string;
  result: "W" | "L" | "D" | "NC";
  method: string;
  round: number | null;
};

export async function listFighterRecentFights(
  client: DbClient,
  fighterId: string,
  limit = 5,
): Promise<FighterFormEntry[]> {
  const { data, error } = await client
    .from("fights")
    .select(`
      id,
      winner_id, result_method, result_round,
      event:event_id(name, event_date),
      fighter_a:fighter_a_id(name),
      fighter_b:fighter_b_id(name)
    `)
    .or(`fighter_a_id.eq.${fighterId},fighter_b_id.eq.${fighterId}`)
    .not("winner_id", "is", null)
    .order("event(event_date)", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((f: any) => {
    const isA = f.fighter_a_id === fighterId;
    const opponent = isA ? f.fighter_b.name : f.fighter_a.name;
    const won = f.winner_id === fighterId;
    const drawOrNc = !f.winner_id || f.result_method === "no_contest";
    const result = drawOrNc ? "NC" : won ? "W" : "L";

    return {
      event_name: f.event?.name || "—",
      event_date: f.event?.event_date || "",
      opponent_name: opponent || "—",
      result,
      method: f.result_method || "—",
      round: f.result_round ?? null,
    };
  });
}

export type FighterPickStats = {
  pick_rate: number;
  win_when_picked: number;
  total_events_picked: number;
};

export async function getFighterPickStats(
  client: DbClient,
  fighterId: string,
): Promise<FighterPickStats> {
  const { data, error } = await client
    .from("event_picks")
    .select("fight_id, winner_id, fights!inner(winner_id)")
    .eq("fights.fighter_a_id", fighterId)
    .or(`fights.fighter_b_id.eq.${fighterId}`)
    .not("winner_id", "is", null);

  if (error) throw error;
  const picks = data || [];

  const total = picks.length;
  const wins = picks.filter((p: any) => p.winner_id === p.fights?.winner_id).length;

  // Distinct event count for pick rate calculation will be done in service layer
  const { data: eventData, error: eventError } = await client
    .from("fights")
    .select("id", { count: "exact", head: true })
    .or(`fighter_a_id.eq.${fighterId},fighter_b_id.eq.${fighterId}`);

  if (eventError) throw eventError;

  // For pick_rate: percentage of users who picked this fighter across all fights
  return {
    pick_rate: 0, // computed in service from total_picks / total_events_with_picks
    win_when_picked: total > 0 ? Math.round((wins / total) * 100) : 0,
    total_events_picked: total,
  };
}
