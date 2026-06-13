import type { Rivalry } from "@/types";

export async function getRivalry(
  client: any,
  userIdA: string,
  userIdB: string,
): Promise<Rivalry | null> {
  const { data, error } = await client
    .from("rivalries")
    .select("*")
    .or(`and(user_id_a.eq.${userIdA},user_id_b.eq.${userIdB}),and(user_id_a.eq.${userIdB},user_id_b.eq.${userIdA})`)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listRivalriesForUser(
  client: any,
  userId: string,
): Promise<Rivalry[]> {
  const { data, error } = await client
    .from("rivalries")
    .select("*")
    .or(`user_id_a.eq.${userId},user_id_b.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data || [];
}

export async function upsertRivalry(
  client: any,
  userIdA: string,
  userIdB: string,
  userAWins: number,
  userBWins: number,
  draws: number,
): Promise<Rivalry> {
  const { data, error } = await client
    .from("rivalries")
    .upsert(
      {
        user_id_a: userIdA,
        user_id_b: userIdB,
        user_a_wins: userAWins,
        user_b_wins: userBWins,
        draws,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id_a, user_id_b" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
