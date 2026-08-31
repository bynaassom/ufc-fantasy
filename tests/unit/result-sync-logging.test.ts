import { describe, expect, it } from "vitest";
import {
  getResultSyncLogPolicy,
  ROUTINE_RESULT_LOG_INTERVAL_SECONDS,
} from "@/server/services/result-sync-logging";
import {
  normalizeOperationalLogPruneResult,
  OPERATIONAL_LOG_RETENTION_DAYS,
} from "@/server/services/activity-log-retention";

describe("result sync log policy", () => {
  it("drops routine receipt logs from the external poller", () => {
    expect(getResultSyncLogPolicy("received", true)).toEqual({
      record: false,
      minIntervalSeconds: 0,
    });
  });

  it("rate limits expected external polling outcomes", () => {
    for (const step of [
      "no_active_event",
      "outside_window",
      "no_scraped_results",
      "no_consensus",
    ]) {
      expect(getResultSyncLogPolicy(step, true)).toEqual({
        record: true,
        minIntervalSeconds: ROUTINE_RESULT_LOG_INTERVAL_SECONDS,
      });
    }
  });

  it("keeps failures, successful imports and manual actions immediate", () => {
    expect(getResultSyncLogPolicy("transaction_failed", true)).toEqual({
      record: true,
      minIntervalSeconds: 0,
    });
    expect(getResultSyncLogPolicy("complete", true)).toEqual({
      record: true,
      minIntervalSeconds: 0,
    });
    expect(getResultSyncLogPolicy("received", false)).toEqual({
      record: true,
      minIntervalSeconds: 0,
    });
  });
});

describe("operational log retention result", () => {
  it("normalizes the database response", () => {
    expect(normalizeOperationalLogPruneResult({
      retention_days: 60,
      activity_logs_deleted: 120,
      card_verification_runs_deleted: 3,
    })).toEqual({
      retentionDays: 60,
      activityLogsDeleted: 120,
      cardVerificationRunsDeleted: 3,
    });
  });

  it("uses safe defaults for an empty response", () => {
    expect(normalizeOperationalLogPruneResult(null)).toEqual({
      retentionDays: OPERATIONAL_LOG_RETENTION_DAYS,
      activityLogsDeleted: 0,
      cardVerificationRunsDeleted: 0,
    });
  });
});
