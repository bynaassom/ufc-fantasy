import type { AdminSupabaseClient } from "@/server/supabase";

export const OPERATIONAL_LOG_RETENTION_DAYS = 60;

export type OperationalLogPruneResult = {
  retentionDays: number;
  activityLogsDeleted: number;
  cardVerificationRunsDeleted: number;
};

function asCount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function normalizeOperationalLogPruneResult(
  value: unknown,
): OperationalLogPruneResult {
  const result = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};

  return {
    retentionDays:
      asCount(result.retention_days) || OPERATIONAL_LOG_RETENTION_DAYS,
    activityLogsDeleted: asCount(result.activity_logs_deleted),
    cardVerificationRunsDeleted: asCount(
      result.card_verification_runs_deleted,
    ),
  };
}

export async function pruneExpiredOperationalLogs(
  client: AdminSupabaseClient,
  retentionDays = OPERATIONAL_LOG_RETENTION_DAYS,
) {
  const { data, error } = await client.rpc("prune_expired_operational_logs", {
    p_retention_days: retentionDays,
  });
  if (error) throw error;
  return normalizeOperationalLogPruneResult(data);
}

export async function tryPruneExpiredOperationalLogs(
  client: AdminSupabaseClient,
) {
  try {
    return await pruneExpiredOperationalLogs(client);
  } catch (error) {
    console.error("Falha ao limpar logs operacionais expirados:", error);
    return null;
  }
}
