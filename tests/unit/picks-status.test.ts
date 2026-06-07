import {
  getFightCardUnavailablePicksLabel,
  getHomePicksStatusLabel,
} from "@/lib/utils";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("picks status labels", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down to picks opening before the pick window starts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T15:00:00.000Z"));

    expect(
      getHomePicksStatusLabel({
        picksOpenAt: "2026-06-08T15:00:00.000Z",
        picksLockAt: "2026-06-15T20:00:00.000Z",
      }),
    ).toBe("PICKS ABREM EM 1 DIA");
  });

  it("counts down to closing while picks are open", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-08T15:00:00.000Z"));

    expect(
      getHomePicksStatusLabel({
        picksOpenAt: "2026-06-07T15:00:00.000Z",
        picksLockAt: "2026-06-09T15:00:00.000Z",
      }),
    ).toBe("PICKS FECHAM EM 1 DIA");
  });

  it("distinguishes picks that have not opened from picks that expired", () => {
    expect(getFightCardUnavailablePicksLabel({ picksOpen: false })).toBe(
      "PICKS FECHADOS",
    );
    expect(getFightCardUnavailablePicksLabel({ picksOpen: true })).toBe(
      "PICKS ENCERRADOS",
    );
  });
});
