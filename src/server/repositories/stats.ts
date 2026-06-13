export async function getConfirmedPickStats(client: any, eventId: string) {
  const { data, error } = await client
    .from("picks")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("is_confirmed", true);

  if (error) throw error;
  const rows = data || [];
  return {
    usersWithConfirmedPicks: new Set(rows.map((row: any) => row.user_id)).size,
    confirmedPickRows: rows.length,
  };
}

export async function countFightsForEvent(client: any, eventId: string) {
  const { count, error } = await client
    .from("fights")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) throw error;
  return count || 0;
}

export async function getChallengeStatsForEvent(client: any, eventId: string) {
  const { data, error } = await client
    .from("challenges")
    .select("status")
    .eq("event_id", eventId);

  if (error) throw error;
  const counts = { pending: 0, accepted: 0, completed: 0 };
  for (const row of data || []) {
    if (row.status === "pending") counts.pending += 1;
    if (row.status === "accepted") counts.accepted += 1;
    if (row.status === "completed") counts.completed += 1;
  }

  return {
    ...counts,
    totalActive: counts.pending + counts.accepted,
  };
}

export async function getLeagueStats(client: any) {
  const [{ count: totalGroups, error: groupsError }, { count: totalMembers, error: membersError }] = await Promise.all([
    client.from("groups").select("*", { count: "exact", head: true }),
    client.from("group_members").select("*", { count: "exact", head: true }),
  ]);

  if (groupsError) throw groupsError;
  if (membersError) throw membersError;

  return {
    totalGroups: totalGroups || 0,
    totalMembers: totalMembers || 0,
  };
}

export async function getEventScoreStats(client: any, eventId: string) {
  const { data, error } = await client
    .from("event_scores")
    .select("total_points, perfect_picks")
    .eq("event_id", eventId);

  if (error) throw error;
  const rows = data || [];
  const totalPoints = rows.reduce((sum: number, row: any) => sum + Number(row.total_points || 0), 0);

  return {
    scoredUsers: rows.length,
    averagePoints: rows.length ? Math.round(totalPoints / rows.length) : 0,
    bestScore: rows.reduce((max: number, row: any) => Math.max(max, Number(row.total_points || 0)), 0),
    perfectPicks: rows.reduce((sum: number, row: any) => sum + Number(row.perfect_picks || 0), 0),
  };
}
