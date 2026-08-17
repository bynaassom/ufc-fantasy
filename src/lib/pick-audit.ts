export type PickAuditSummaryInput = {
  totalFights: number;
  currentPickCount: number;
  lockAt?: string | null;
  attempts: Array<{
    status: string;
    received_at: string;
    completed_at?: string | null;
  }>;
  versions: Array<{
    operation: string;
    occurred_at: string;
    changed_fields?: string[] | null;
  }>;
};

export function buildPickAuditSummary(input: PickAuditSummaryInput) {
  const savedAttempts = input.attempts.filter((attempt) => attempt.status === "saved");
  const rejectedAttempts = input.attempts.filter(
    (attempt) => attempt.status === "rejected",
  ).length;
  const saveTimes = savedAttempts
    .map((attempt) => attempt.completed_at || attempt.received_at)
    .filter(Boolean)
    .sort();
  const firstSaveAt = saveTimes[0] || null;
  const lastSaveAt = saveTimes.at(-1) || null;
  const decisionChanges = input.versions.filter(
    (version) =>
      version.operation === "update" &&
      (version.changed_fields || []).some((field) =>
        ["picked_winner_id", "picked_method", "picked_round"].includes(field),
      ),
  ).length;

  let lastSaveTiming: "before_lock" | "after_lock" | "unknown" = "unknown";
  let lastSaveOffsetSeconds: number | null = null;
  if (lastSaveAt && input.lockAt) {
    const saveTime = new Date(lastSaveAt).getTime();
    const lockTime = new Date(input.lockAt).getTime();
    if (Number.isFinite(saveTime) && Number.isFinite(lockTime)) {
      lastSaveOffsetSeconds = Math.round((lockTime - saveTime) / 1_000);
      lastSaveTiming = lastSaveOffsetSeconds >= 0 ? "before_lock" : "after_lock";
    }
  }

  return {
    currentPickCount: input.currentPickCount,
    totalFights: input.totalFights,
    coveragePercent:
      input.totalFights > 0
        ? Math.round((input.currentPickCount / input.totalFights) * 100)
        : 0,
    firstSaveAt,
    lastSaveAt,
    savedAttempts: savedAttempts.length,
    rejectedAttempts,
    decisionChanges,
    lastSaveTiming,
    lastSaveOffsetSeconds,
  };
}
