import {
  countConfirmedPicksForFight,
  listPerfectPickUsersForFight,
} from "@/server/repositories/picks";

function createQuery(result: Record<string, unknown>) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    then: (resolve: (value: Record<string, unknown>) => unknown) =>
      Promise.resolve(result).then(resolve),
  };

  return query;
}

describe("picks repository", () => {
  it("lists perfect pick users only from confirmed picks", async () => {
    const query = createQuery({
      data: [{ user_id: "user-1", event_id: "event-1", fight_id: "fight-1", total_points: 3 }],
      error: null,
    });
    const client = { from: vi.fn(() => query) };

    const result = await listPerfectPickUsersForFight(client, "fight-1");

    expect(result).toHaveLength(1);
    expect(client.from).toHaveBeenCalledWith("picks");
    expect(query.select).toHaveBeenCalledWith(
      "user_id, event_id, fight_id, total_points",
    );
    expect(query.eq).toHaveBeenCalledWith("fight_id", "fight-1");
    expect(query.eq).toHaveBeenCalledWith("is_confirmed", true);
    expect(query.eq).toHaveBeenCalledWith("total_points", 3);
  });

  it("counts confirmed picks for one fight", async () => {
    const query = createQuery({ count: 42, error: null });
    const client = { from: vi.fn(() => query) };

    const result = await countConfirmedPicksForFight(client, "fight-1");

    expect(result).toBe(42);
    expect(client.from).toHaveBeenCalledWith("picks");
    expect(query.select).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(query.eq).toHaveBeenCalledWith("fight_id", "fight-1");
    expect(query.eq).toHaveBeenCalledWith("is_confirmed", true);
  });
});
