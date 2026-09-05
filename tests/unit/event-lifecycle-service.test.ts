import { promoteDueEventsToLive } from "@/server/services/event-lifecycle";

function queryResult(result: { data: unknown; error: unknown }) {
  type QueryMock = {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    then: PromiseLike<typeof result>["then"];
  };
  let query: QueryMock;
  query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (onfulfilled, onrejected) =>
      Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return query;
}

describe("event lifecycle service", () => {
  it("ignores stale live events when promoting the current event", async () => {
    const activeLiveQuery = queryResult({ data: null, error: null });
    const dueEvent = {
      id: "current-event",
      name: "UFC Current",
      slug: "ufc-current",
      event_date: "2026-09-05T16:00:00.000Z",
      prelims_start_at: "2026-09-05T16:00:00.000Z",
    };
    const dueEventQuery = queryResult({ data: [dueEvent], error: null });
    const updateQuery = queryResult({
      data: { id: dueEvent.id },
      error: null,
    });
    const client = {
      from: vi
        .fn()
        .mockReturnValueOnce(activeLiveQuery)
        .mockReturnValueOnce(dueEventQuery)
        .mockReturnValueOnce(updateQuery),
    };

    const promoted = await promoteDueEventsToLive(
      client as any,
      new Date("2026-09-05T16:30:00.000Z"),
    );

    expect(activeLiveQuery.gte).toHaveBeenCalledWith(
      "event_date",
      "2026-09-05T08:30:00.000Z",
    );
    expect(updateQuery.update).toHaveBeenCalledWith({ status: "live" });
    expect(promoted).toEqual([dueEvent]);
  });

  it("keeps a genuinely active live event from being replaced", async () => {
    const activeLiveQuery = queryResult({
      data: { id: "already-live" },
      error: null,
    });
    const client = { from: vi.fn(() => activeLiveQuery) };

    const promoted = await promoteDueEventsToLive(
      client as any,
      new Date("2026-09-05T16:30:00.000Z"),
    );

    expect(promoted).toEqual([]);
    expect(client.from).toHaveBeenCalledTimes(1);
  });
});
