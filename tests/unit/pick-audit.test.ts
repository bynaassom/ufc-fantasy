import { buildPickAuditSummary } from "@/lib/pick-audit";

describe("pick audit summary", () => {
  it("summarizes coverage, failures and meaningful decision changes", () => {
    const summary = buildPickAuditSummary({
      totalFights: 12,
      currentPickCount: 9,
      lockAt: "2026-08-16T00:30:00.000Z",
      attempts: [
        {
          status: "saved",
          received_at: "2026-08-15T22:00:00.000Z",
          completed_at: "2026-08-15T22:00:01.000Z",
        },
        {
          status: "rejected",
          received_at: "2026-08-16T00:31:00.000Z",
          completed_at: "2026-08-16T00:31:00.000Z",
        },
      ],
      versions: [
        {
          operation: "update",
          occurred_at: "2026-08-15T22:00:01.000Z",
          changed_fields: ["picked_winner_id", "confirmed_at"],
        },
        {
          operation: "update",
          occurred_at: "2026-08-15T22:00:01.000Z",
          changed_fields: ["confirmed_at"],
        },
      ],
    });

    expect(summary).toMatchObject({
      currentPickCount: 9,
      totalFights: 12,
      coveragePercent: 75,
      savedAttempts: 1,
      rejectedAttempts: 1,
      decisionChanges: 1,
      lastSaveTiming: "before_lock",
      lastSaveOffsetSeconds: 8_999,
    });
  });

  it("keeps timing unknown when no accepted server save exists", () => {
    const summary = buildPickAuditSummary({
      totalFights: 0,
      currentPickCount: 0,
      lockAt: null,
      attempts: [],
      versions: [],
    });

    expect(summary.coveragePercent).toBe(0);
    expect(summary.firstSaveAt).toBeNull();
    expect(summary.lastSaveAt).toBeNull();
    expect(summary.lastSaveTiming).toBe("unknown");
  });
});
