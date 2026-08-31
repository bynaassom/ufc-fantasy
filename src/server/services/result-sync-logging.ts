export const ROUTINE_RESULT_LOG_INTERVAL_SECONDS = 15 * 60;
export const RESULT_SYNC_ALERT_INTERVAL_SECONDS = 60 * 60;

const ROUTINE_EXTERNAL_STEPS = new Set([
  "no_active_event",
  "outside_window",
  "no_scraped_results",
  "no_consensus",
]);

export type ResultSyncLogPolicy = {
  record: boolean;
  minIntervalSeconds: number;
};

export function getResultSyncLogPolicy(
  step: string,
  isExternalCall: boolean,
): ResultSyncLogPolicy {
  if (!isExternalCall) return { record: true, minIntervalSeconds: 0 };
  if (step === "received") return { record: false, minIntervalSeconds: 0 };
  if (ROUTINE_EXTERNAL_STEPS.has(step)) {
    return {
      record: true,
      minIntervalSeconds: ROUTINE_RESULT_LOG_INTERVAL_SECONDS,
    };
  }
  return { record: true, minIntervalSeconds: 0 };
}
