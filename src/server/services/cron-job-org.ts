import {
  RESULT_POLLING_INTERVAL_MINUTES,
  getResultPollingWindow,
} from "@/lib/result-polling";

const API_BASE = "https://api.cron-job.org";
const STARTER_TITLE = "UFC Fantasy · Iniciar resultados";
const POLLER_TITLE = "UFC Fantasy · Resultados ao vivo";

type ScheduledEvent = {
  id: string;
  prelims_start_at?: string | null;
  event_date?: string | null;
};

type JobSummary = { jobId: number; title: string; enabled: boolean };

type CronConfig = {
  apiKey: string;
  syncSecret: string;
  appUrl: string;
};

function getConfig(): CronConfig | null {
  const apiKey = process.env.CRON_JOB_ORG_API_KEY;
  const syncSecret = process.env.SYNC_SECRET;
  const rawAppUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiKey || !syncSecret || !rawAppUrl) return null;
  return {
    apiKey,
    syncSecret,
    appUrl: rawAppUrl.replace(/\/$/, ""),
  };
}

function expiresAt(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return Number(
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`,
  );
}

export function buildResultStarterSchedule(event: ScheduledEvent) {
  const window = getResultPollingWindow(event);
  if (!window) return null;
  const start = new Date(window.startsAt);
  return {
    timezone: "UTC",
    expiresAt: expiresAt(new Date(start.getTime() + 10 * 60_000)),
    hours: [start.getUTCHours()],
    mdays: [start.getUTCDate()],
    minutes: [start.getUTCMinutes()],
    months: [start.getUTCMonth() + 1],
    wdays: [-1],
  };
}

export function buildResultPollingSchedule(event: ScheduledEvent) {
  const window = getResultPollingWindow(event);
  if (!window) return null;
  return {
    timezone: "UTC",
    expiresAt: expiresAt(new Date(window.safetyEndsAt)),
    hours: [-1],
    mdays: [-1],
    minutes: Array.from(
      { length: 60 / RESULT_POLLING_INTERVAL_MINUTES },
      (_, index) => index * RESULT_POLLING_INTERVAL_MINUTES,
    ),
    months: [-1],
    wdays: [-1],
  };
}

async function cronRequest<T>(
  config: CronConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`cron-job.org HTTP ${response.status}: ${await response.text()}`);
  }
  return response.status === 204 ? ({} as T) : ((await response.json()) as T);
}

async function findJob(config: CronConfig, title: string) {
  const data = await cronRequest<{ jobs?: JobSummary[] }>(config, "/jobs");
  return (data.jobs || []).find((job) => job.title === title) || null;
}

async function upsertJob(
  config: CronConfig,
  title: string,
  job: Record<string, unknown>,
) {
  const existing = await findJob(config, title);
  if (existing) {
    await cronRequest(config, `/jobs/${existing.jobId}`, {
      method: "PATCH",
      body: JSON.stringify({ job: { title, ...job } }),
    });
    return { jobId: existing.jobId, created: false };
  }

  const created = await cronRequest<{ jobId: number }>(config, "/jobs", {
    method: "PUT",
    body: JSON.stringify({ job: { title, ...job } }),
  });
  return { jobId: created.jobId, created: true };
}

function protectedPostJob(
  config: CronConfig,
  url: string,
  schedule: Record<string, unknown>,
) {
  return {
    enabled: true,
    url,
    requestMethod: 1,
    requestTimeout: 60,
    saveResponses: false,
    schedule,
    extendedData: {
      headers: {
        Authorization: `Bearer ${config.syncSecret}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    },
    notification: {
      onFailure: true,
      onFailureCount: 2,
      onSuccess: true,
      onDisable: false,
      onSslCertExpiry: true,
    },
  };
}

export async function scheduleResultPollingStart(event: ScheduledEvent) {
  const config = getConfig();
  if (!config) return { configured: false as const, reason: "missing_config" };
  const schedule = buildResultStarterSchedule(event);
  if (!schedule) return { configured: false as const, reason: "invalid_event_time" };

  const result = await upsertJob(
    config,
    STARTER_TITLE,
    protectedPostJob(
      config,
      `${config.appUrl}/api/cron/start-result-polling?event_id=${encodeURIComponent(event.id)}`,
      schedule,
    ),
  );
  return { configured: true as const, ...result, startsAt: getResultPollingWindow(event)!.startsAt };
}

export async function activateResultPolling(event: ScheduledEvent) {
  const config = getConfig();
  if (!config) return { configured: false as const, reason: "missing_config" };
  const schedule = buildResultPollingSchedule(event);
  if (!schedule) return { configured: false as const, reason: "invalid_event_time" };

  const result = await upsertJob(
    config,
    POLLER_TITLE,
    protectedPostJob(
      config,
      `${config.appUrl}/api/sync-results?event_id=${encodeURIComponent(event.id)}`,
      schedule,
    ),
  );
  return { configured: true as const, ...result, safetyEndsAt: getResultPollingWindow(event)!.safetyEndsAt };
}

export async function disableResultPolling() {
  const config = getConfig();
  if (!config) return { configured: false as const, reason: "missing_config" };
  const existing = await findJob(config, POLLER_TITLE);
  if (!existing || !existing.enabled) {
    return { configured: true as const, disabled: false };
  }
  await cronRequest(config, `/jobs/${existing.jobId}`, {
    method: "PATCH",
    body: JSON.stringify({ job: { enabled: false } }),
  });
  return { configured: true as const, disabled: true, jobId: existing.jobId };
}
