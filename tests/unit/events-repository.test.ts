import {
  deleteEvent,
  findEventBySlugWithFights,
  getCurrentPublicEvent,
} from "@/server/repositories/events";

describe("events repository", () => {
  it("includes fight odds in the public event payload", async () => {
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: { id: "event-1" }, error: null })),
    };
    const client = { from: vi.fn(() => query) };

    await findEventBySlugWithFights(client, "ufc-test");

    const selectedFields = query.select.mock.calls[0][0] as string;
    expect(selectedFields).toContain("is_bonus");
    expect(selectedFields).toContain("odds_a");
    expect(selectedFields).toContain("odds_b");
    expect(query.eq).toHaveBeenCalledWith("slug", "ufc-test");
  });

  it("keeps bonus events out of the primary event slot", async () => {
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      gte: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    const client = { from: vi.fn(() => query) } as any;

    await getCurrentPublicEvent(client);

    expect(query.eq).toHaveBeenCalledWith("is_bonus", false);
  });

  it("deletes an event through the privileged cascade operation", async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));

    await deleteEvent({ rpc } as any, "event-1");

    expect(rpc).toHaveBeenCalledWith("delete_event_cascade", {
      p_event_id: "event-1",
    });
  });

  it("surfaces a failed privileged cascade operation", async () => {
    const error = { code: "P0001", message: "cascade failed" };
    const rpc = vi.fn(async () => ({ data: null, error }));

    await expect(deleteEvent({ rpc } as any, "event-1")).rejects.toBe(error);
  });
});
