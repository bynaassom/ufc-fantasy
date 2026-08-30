import type { AdminSupabaseClient } from "@/server/supabase";

export const AUTOMATION_DEFINITIONS = {
  events: {
    label: "Eventos",
    expectedIntervalMinutes: 24 * 60,
    staleAfterMinutes: 26 * 60,
  },
  cards: { label: "Cards", expectedIntervalMinutes: 60, staleAfterMinutes: 120 },
  results: { label: "Resultados", expectedIntervalMinutes: 2, staleAfterMinutes: 6 },
  notifications: {
    label: "Notificações",
    expectedIntervalMinutes: 5,
    staleAfterMinutes: 12,
  },
} as const;

export type AutomationKey = keyof typeof AUTOMATION_DEFINITIONS;
export type AutomationRunStatus = "running" | "success" | "warning" | "error";

type AutomationHealthRow = {
  automation_key: string;
  status: AutomationRunStatus;
  expected_interval_minutes: number;
  last_started_at: string | null;
  last_succeeded_at: string | null;
  last_failed_at: string | null;
  last_duration_ms: number | null;
  consecutive_failures: number;
  last_error: string | null;
  details: Record<string, unknown> | null;
  updated_at: string;
};

function elapsedMs(startedAt: string) {
  return Math.max(0, Date.now() - new Date(startedAt).getTime());
}

export async function recordAutomationHealth(
  client: AdminSupabaseClient,
  automationKey: AutomationKey,
  status: AutomationRunStatus,
  startedAt: string,
  options: {
    error?: string | null;
    details?: Record<string, unknown>;
    durationMs?: number | null;
  } = {},
) {
  const definition = AUTOMATION_DEFINITIONS[automationKey];
  const { error } = await client.rpc("record_automation_health", {
    p_automation_key: automationKey,
    p_status: status,
    p_expected_interval_minutes: definition.expectedIntervalMinutes,
    p_started_at: startedAt,
    p_duration_ms:
      options.durationMs ?? (status === "running" ? null : elapsedMs(startedAt)),
    p_error: options.error || null,
    p_details: options.details || {},
  });
  if (error) throw error;
}

export async function tryRecordAutomationHealth(
  client: AdminSupabaseClient,
  automationKey: AutomationKey,
  status: AutomationRunStatus,
  startedAt: string,
  options: {
    error?: string | null;
    details?: Record<string, unknown>;
    durationMs?: number | null;
  } = {},
) {
  try {
    await recordAutomationHealth(client, automationKey, status, startedAt, options);
  } catch (error) {
    console.error(`Falha ao registrar saúde da automação ${automationKey}:`, error);
  }
}

export type AutomationHealth = {
  key: AutomationKey;
  label: string;
  status: "healthy" | "warning" | "error" | "unknown";
  runStatus: AutomationRunStatus | null;
  expectedIntervalMinutes: number;
  lastStartedAt: string | null;
  lastSucceededAt: string | null;
  lastFailedAt: string | null;
  lastDurationMs: number | null;
  consecutiveFailures: number;
  lastError: string | null;
  details: Record<string, unknown>;
};

export function normalizeAutomationHealth(
  rows: AutomationHealthRow[],
  now = new Date(),
): AutomationHealth[] {
  const rowsByKey = new Map(rows.map((row) => [row.automation_key, row]));

  return Object.entries(AUTOMATION_DEFINITIONS).map(([key, definition]) => {
    const automationKey = key as AutomationKey;
    const row = rowsByKey.get(automationKey);
    if (!row) {
      return {
        key: automationKey,
        label: definition.label,
        status: "unknown" as const,
        runStatus: null,
        expectedIntervalMinutes: definition.expectedIntervalMinutes,
        lastStartedAt: null,
        lastSucceededAt: null,
        lastFailedAt: null,
        lastDurationMs: null,
        consecutiveFailures: 0,
        lastError: null,
        details: {},
      };
    }

    const lastSignalAt = row.last_started_at || row.updated_at;
    const staleAfterMs = definition.staleAfterMinutes * 60_000;
    const isStale = now.getTime() - new Date(lastSignalAt).getTime() > staleAfterMs;
    const status = row.status === "error"
      ? "error"
      : isStale || row.status === "warning" || row.status === "running"
        ? "warning"
        : "healthy";

    return {
      key: automationKey,
      label: definition.label,
      status,
      runStatus: row.status,
      expectedIntervalMinutes: definition.expectedIntervalMinutes,
      lastStartedAt: row.last_started_at,
      lastSucceededAt: row.last_succeeded_at,
      lastFailedAt: row.last_failed_at,
      lastDurationMs: row.last_duration_ms,
      consecutiveFailures: row.consecutive_failures,
      lastError: row.last_error,
      details: row.details || {},
    };
  });
}

export async function getAutomationHealth(
  client: AdminSupabaseClient,
  now = new Date(),
) {
  const { data, error } = await client
    .from("automation_health")
    .select("automation_key, status, expected_interval_minutes, last_started_at, last_succeeded_at, last_failed_at, last_duration_ms, consecutive_failures, last_error, details, updated_at");

  if (error) {
    console.error("Falha ao consultar saúde das automações:", error);
    return normalizeAutomationHealth([], now);
  }

  return normalizeAutomationHealth((data || []) as AutomationHealthRow[], now);
}
