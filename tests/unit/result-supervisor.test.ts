import { describe, expect, it, vi } from "vitest";

import {
  eligibleResultEvents,
  isResultFallbackDue,
  superviseResultEvents,
  type ResultSupervisorEvent,
} from "@/server/services/result-supervisor";

describe("result supervisor", () => {
  const now = new Date("2026-08-30T02:00:00.000Z");
  const events: ResultSupervisorEvent[] = [
    {
      id: "main",
      name: "Main event",
      status: "live",
      prelims_start_at: "2026-08-30T00:00:00.000Z",
      event_date: "2026-08-30T03:00:00.000Z",
    },
    {
      id: "bonus",
      name: "Bonus event",
      status: "upcoming",
      prelims_start_at: "2026-08-30T01:00:00.000Z",
      event_date: "2026-08-30T04:00:00.000Z",
    },
    {
      id: "future",
      name: "Future event",
      status: "upcoming",
      prelims_start_at: "2026-09-06T00:00:00.000Z",
      event_date: "2026-09-06T03:00:00.000Z",
    },
  ];

  it("selects every simultaneous eligible event instead of only the first one", () => {
    expect(eligibleResultEvents(events, now).map((event) => event.id)).toEqual([
      "main",
      "bonus",
    ]);
  });

  it("processes eligible events independently and releases acquired leases", async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const sync = vi.fn(async (event: ResultSupervisorEvent) => ({
      ok: event.id !== "bonus",
      status: event.id === "bonus" ? 500 : 200,
      body: { event_id: event.id },
    }));

    const result = await superviseResultEvents(
      events,
      {
        claim: vi.fn().mockResolvedValue(true),
        release,
        sync,
      },
      now,
    );

    expect(sync).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      checked: 3,
      eligible: 2,
      processed: 1,
      busy: 0,
      failed: 1,
    });
  });

  it("skips an event already claimed by the redundant fallback", async () => {
    const sync = vi.fn();
    const result = await superviseResultEvents(
      [events[0]],
      {
        claim: vi.fn().mockResolvedValue(false),
        release: vi.fn(),
        sync,
      },
      now,
    );

    expect(sync).not.toHaveBeenCalled();
    expect(result.busy).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("runs the five-minute fallback only when the primary supervisor is stale", () => {
    expect(
      isResultFallbackDue(
        { status: "success", last_started_at: "2026-08-30T01:58:00.000Z" },
        now,
      ),
    ).toBe(false);
    expect(
      isResultFallbackDue(
        { status: "success", last_started_at: "2026-08-30T01:54:00.000Z" },
        now,
      ),
    ).toBe(true);
    expect(
      isResultFallbackDue(
        { status: "error", last_started_at: "2026-08-30T01:59:00.000Z" },
        now,
      ),
    ).toBe(true);
    expect(isResultFallbackDue(null, now)).toBe(true);
  });
});
