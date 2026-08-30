import { RESULT_POLLING_SAFETY_HOURS, shouldPollFightResults } from "@/lib/result-polling";
import type { AdminSupabaseClient } from "@/server/supabase";

const EVENT_SYNC_TIMEOUT_MS = 24_000;
const RESULT_SYNC_LEASE_SECONDS = 90;
const RESULT_FALLBACK_STALE_MS = 4 * 60_000;

export type ResultSupervisorEvent = {
  id: string;
  name: string;
  status?: string | null;
  event_date?: string | null;
  prelims_start_at?: string | null;
  ufc_event_id?: string | null;
  ufc_stats_url?: string | null;
};

export type ResultSupervisorEventOutcome = {
  eventId: string;
  eventName: string;
  status: "processed" | "busy" | "failed";
  httpStatus?: number;
  response?: unknown;
  error?: string;
};

export type ResultSupervisorOutcome = {
  checked: number;
  eligible: number;
  processed: number;
  busy: number;
  failed: number;
  events: ResultSupervisorEventOutcome[];
};

export function isResultFallbackDue(
  health: { status?: string | null; last_started_at?: string | null } | null,
  now: Date | number = Date.now(),
) {
  if (!health || health.status === "error" || !health.last_started_at) return true;
  const lastStartedAt = new Date(health.last_started_at).getTime();
  if (!Number.isFinite(lastStartedAt)) return true;
  const nowMs = now instanceof Date ? now.getTime() : now;
  return nowMs - lastStartedAt > RESULT_FALLBACK_STALE_MS;
}

type ResultSupervisorDependencies = {
  claim: (eventId: string) => Promise<boolean>;
  release: (eventId: string) => Promise<void>;
  sync: (event: ResultSupervisorEvent) => Promise<{
    ok: boolean;
    status: number;
    body: unknown;
  }>;
};

export function eligibleResultEvents(
  events: ResultSupervisorEvent[],
  now: Date | number = Date.now(),
) {
  return events.filter((event) => shouldPollFightResults(event, now));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "falha desconhecida";
}

export async function superviseResultEvents(
  events: ResultSupervisorEvent[],
  dependencies: ResultSupervisorDependencies,
  now: Date | number = Date.now(),
): Promise<ResultSupervisorOutcome> {
  const eligible = eligibleResultEvents(events, now);
  const outcomes = await Promise.all(
    eligible.map(async (event): Promise<ResultSupervisorEventOutcome> => {
      let claimed = false;
      let syncResponded = false;
      try {
        claimed = await dependencies.claim(event.id);
        if (!claimed) {
          return {
            eventId: event.id,
            eventName: event.name,
            status: "busy",
          };
        }

        const result = await dependencies.sync(event);
        syncResponded = true;
        if (!result.ok) {
          return {
            eventId: event.id,
            eventName: event.name,
            status: "failed",
            httpStatus: result.status,
            response: result.body,
            error: `sync-results HTTP ${result.status}`,
          };
        }

        return {
          eventId: event.id,
          eventName: event.name,
          status: "processed",
          httpStatus: result.status,
          response: result.body,
        };
      } catch (error) {
        return {
          eventId: event.id,
          eventName: event.name,
          status: "failed",
          error: errorMessage(error),
        };
      } finally {
        // If the HTTP call itself times out, keep the lease until its TTL. The
        // serverless child may still be finishing after the caller disconnects.
        if (claimed && syncResponded) {
          await dependencies.release(event.id).catch((error) => {
            console.error(`Falha ao liberar lease de resultados do evento ${event.id}:`, error);
          });
        }
      }
    }),
  );

  return {
    checked: events.length,
    eligible: eligible.length,
    processed: outcomes.filter((outcome) => outcome.status === "processed").length,
    busy: outcomes.filter((outcome) => outcome.status === "busy").length,
    failed: outcomes.filter((outcome) => outcome.status === "failed").length,
    events: outcomes,
  };
}

async function responseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 2_000);
  }
}

export async function runResultSupervisor(
  client: AdminSupabaseClient,
  options: {
    origin: string;
    syncSecret: string;
    now?: Date;
    fetchImpl?: typeof fetch;
  },
) {
  const now = options.now || new Date();
  const earliestEventDate = new Date(
    now.getTime() - RESULT_POLLING_SAFETY_HOURS * 60 * 60_000,
  ).toISOString();
  const latestEventDate = new Date(
    now.getTime() + RESULT_POLLING_SAFETY_HOURS * 60 * 60_000,
  ).toISOString();
  const { data, error } = await client
    .from("events")
    .select("id, name, status, event_date, prelims_start_at, ufc_event_id, ufc_stats_url")
    .in("status", ["upcoming", "live"])
    .or("ufc_stats_url.not.is.null,ufc_event_id.not.is.null")
    .gte("event_date", earliestEventDate)
    .lte("event_date", latestEventDate)
    .order("event_date", { ascending: true });
  if (error) throw error;

  const fetchImpl = options.fetchImpl || fetch;
  const origin = options.origin.replace(/\/$/, "");
  return superviseResultEvents(
    (data || []) as ResultSupervisorEvent[],
    {
      claim: async (eventId) => {
        const { data: claimed, error: claimError } = await client.rpc(
          "claim_result_sync",
          {
            p_event_id: eventId,
            p_lease_seconds: RESULT_SYNC_LEASE_SECONDS,
          },
        );
        if (claimError) throw claimError;
        return claimed === true;
      },
      release: async (eventId) => {
        const { error: releaseError } = await client.rpc("release_result_sync", {
          p_event_id: eventId,
        });
        if (releaseError) throw releaseError;
      },
      sync: async (event) => {
        const url = new URL("/api/sync-results", `${origin}/`);
        url.searchParams.set("event_id", event.id);
        const response = await fetchImpl(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.syncSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ event_id: event.id }),
          cache: "no-store",
          signal: AbortSignal.timeout(EVENT_SYNC_TIMEOUT_MS),
        });
        return {
          ok: response.ok,
          status: response.status,
          body: await responseBody(response),
        };
      },
    },
    now,
  );
}
