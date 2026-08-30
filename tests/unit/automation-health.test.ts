import { describe, expect, it } from "vitest";

import { normalizeAutomationHealth } from "@/server/services/automation-health";

describe("automation health", () => {
  const now = new Date("2026-08-30T12:00:00.000Z");

  it("marks recent signals healthy and stale signals as attention", () => {
    const health = normalizeAutomationHealth(
      [
        {
          automation_key: "results",
          status: "success",
          expected_interval_minutes: 2,
          last_started_at: "2026-08-30T11:59:00.000Z",
          last_succeeded_at: "2026-08-30T11:59:01.000Z",
          last_failed_at: null,
          last_duration_ms: 1_000,
          consecutive_failures: 0,
          last_error: null,
          details: {},
          updated_at: "2026-08-30T11:59:01.000Z",
        },
        {
          automation_key: "notifications",
          status: "success",
          expected_interval_minutes: 5,
          last_started_at: "2026-08-30T11:40:00.000Z",
          last_succeeded_at: "2026-08-30T11:40:01.000Z",
          last_failed_at: null,
          last_duration_ms: 1_000,
          consecutive_failures: 0,
          last_error: null,
          details: {},
          updated_at: "2026-08-30T11:40:01.000Z",
        },
      ],
      now,
    );

    expect(health.find((item) => item.key === "results")?.status).toBe("healthy");
    expect(health.find((item) => item.key === "notifications")?.status).toBe("warning");
  });

  it("preserves explicit failures and returns unknown for jobs without a heartbeat", () => {
    const health = normalizeAutomationHealth(
      [
        {
          automation_key: "cards",
          status: "error",
          expected_interval_minutes: 60,
          last_started_at: "2026-08-30T11:50:00.000Z",
          last_succeeded_at: null,
          last_failed_at: "2026-08-30T11:50:10.000Z",
          last_duration_ms: 10_000,
          consecutive_failures: 2,
          last_error: "timeout",
          details: {},
          updated_at: "2026-08-30T11:50:10.000Z",
        },
      ],
      now,
    );

    expect(health.find((item) => item.key === "cards")).toMatchObject({
      status: "error",
      consecutiveFailures: 2,
      lastError: "timeout",
    });
    expect(health.find((item) => item.key === "events")?.status).toBe("unknown");
  });
});
