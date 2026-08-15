import type {
  OperationLog,
  OperationLogSource,
  OperationLogStatus,
  OperationLogTrigger,
} from "@/components/admin/operation-log-types";
import { getAdminSupabase } from "@/server/supabase";

const OPERATION_ACTIONS = [
  "admin_sync_results",
  "admin_sync_alert",
  "admin_sync_events",
  "admin_preview_events",
  "admin_update_card",
  "admin_sync_odds",
];

const SENSITIVE_KEY = /authorization|cookie|password|secret|token|api[_-]?key/i;

export function sanitizeLogDetails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeLogDetails);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[oculto]" : sanitizeLogDetails(item),
    ]),
  );
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object"
    ? (value as Record<string, any>)
    : {};
}

function asNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTrigger(details: Record<string, any>): OperationLogTrigger {
  if (details.is_external === true || details.trigger === "cron") return "cron";
  if (details.trigger === "system") return "system";
  return "admin";
}

function getResultStatus(step: string): OperationLogStatus {
  if (step === "complete") return "success";
  if (step === "rejected" || step === "transaction_failed") return "error";
  if (
    step === "no_scraped_results" ||
    step === "no_consensus" ||
    step === "no_fights" ||
    step === "event_not_found"
  ) {
    return "warning";
  }
  return "info";
}

function getActivityMetadata(action: string, details: Record<string, any>) {
  const step = String(details.step || "");

  if (action === "admin_sync_results") {
    const labels: Record<string, string> = {
      received: "Requisição recebida",
      rejected: "Requisição recusada",
      no_active_event: "Nenhum evento ativo",
      outside_window: "Fora da janela de resultados",
      no_event_id: "Evento não informado",
      event_not_found: "Evento não encontrado",
      no_fights: "Evento sem lutas",
      no_scraped_results: "Resultados ainda indisponíveis",
      no_consensus: "Fontes sem consenso",
      dry_run: "Prévia de resultados concluída",
      transaction_failed: "Falha ao salvar resultados",
      complete: "Resultados sincronizados",
    };
    const imported = asNumber(details.imported_count);
    const scraped = asNumber(details.scraped_count);
    return {
      category: "results" as const,
      status: getResultStatus(step),
      title: "Sincronização de resultados",
      summary:
        labels[step] ||
        (imported !== null
          ? `${imported} resultado(s) importado(s) de ${scraped || 0} encontrado(s)`
          : "Execução registrada"),
    };
  }

  if (action === "admin_sync_alert") {
    return {
      category: "system" as const,
      status: "error" as const,
      title: "Alerta de sincronização",
      summary: `${details.count || 0} falhas consecutivas detectadas`,
    };
  }

  if (action === "admin_sync_events") {
    const errors = asNumber(details.card_error_count) || 0;
    const pending = asNumber(details.card_pending_count) || 0;
    return {
      category: "events" as const,
      status: details.status === "error" ? "error" as const : errors || pending ? "warning" as const : "success" as const,
      title: "Sincronização de eventos",
      summary:
        details.message ||
        `${details.created_count || 0} criado(s), ${details.updated_count || 0} atualizado(s)`,
    };
  }

  if (action === "admin_preview_events") {
    return {
      category: "events" as const,
      status: details.status === "error" ? "error" as const : "info" as const,
      title: "Consulta de próximos eventos",
      summary:
        details.message ||
        `${details.candidate_count || 0} evento(s) retornado(s) pelo UFC`,
    };
  }

  if (action === "admin_update_card") {
    const status = (details.status || "success") as OperationLogStatus;
    return {
      category: "card" as const,
      status,
      title: details.preview ? "Prévia do card" : "Atualização do card",
      summary:
        details.message ||
        `+${details.added_count || 0} / ~${details.updated_count || 0} / -${details.removed_count || 0}`,
    };
  }

  return {
    category: "odds" as const,
    status: details.status === "error" ? "error" as const : details.dry_run ? "info" as const : "success" as const,
    title: details.dry_run ? "Prévia de odds" : "Sincronização de odds",
    summary:
      details.message ||
      `${details.saved_count || 0} luta(s) atualizada(s), ${details.skipped_count || 0} sem match`,
  };
}

function normalizeSources(details: Record<string, any>): OperationLogSource[] {
  if (!Array.isArray(details.sources)) return [];

  return details.sources.map((source: Record<string, any>) => ({
    label: String(source.label || source.source || "Fonte"),
    url: typeof source.url === "string" ? source.url : null,
    resultsCount: asNumber(source.results_count),
    error: typeof source.error === "string" ? source.error : null,
  }));
}

function normalizeActivityLog(
  row: Record<string, any>,
  eventNames: Map<string, string>,
): OperationLog {
  const details = asRecord(row.details);
  const metadata = getActivityMetadata(row.action, details);
  const eventId = typeof details.event_id === "string" ? details.event_id : null;
  const durationMs = asNumber(details.duration_ms);
  const sanitized = sanitizeLogDetails(details) as Record<string, unknown>;
  const errorValue = details.error;

  return {
    id: `activity:${row.id}`,
    ...metadata,
    trigger: getTrigger(details),
    eventId,
    eventName: eventId ? eventNames.get(eventId) || details.event_name || null : null,
    createdAt: row.created_at,
    completedAt: null,
    durationMs,
    sources: normalizeSources(details),
    details: sanitized,
    error:
      typeof errorValue === "string"
        ? errorValue
        : typeof errorValue?.message === "string"
          ? errorValue.message
          : details.status === "error" && typeof details.message === "string"
            ? details.message
            : null,
  };
}

function normalizeVerificationRun(
  row: Record<string, any>,
  eventNames: Map<string, string>,
): OperationLog {
  const summary = asRecord(row.summary);
  const status: OperationLogStatus =
    row.status === "completed"
      ? summary.alerts?.length
        ? "warning"
        : "success"
      : row.status === "failed"
        ? "error"
        : "running";
  const started = new Date(row.started_at).getTime();
  const completed = row.completed_at ? new Date(row.completed_at).getTime() : null;
  const changes = asRecord(summary.changes);
  const changeCount = [changes.added, changes.updated, changes.removed].reduce(
    (total, items) => total + (Array.isArray(items) ? items.length : 0),
    0,
  );
  const sources: OperationLogSource[] = [];
  const sourceDetails = asRecord(summary.sources);
  for (const source of Object.values(sourceDetails) as Record<string, any>[]) {
    sources.push({
      label: source.api_url ? "UFC API oficial" : source.url?.includes("ufcstats") ? "UFCStats" : "UFC.com",
      url: source.api_url || source.url || null,
      resultsCount: asNumber(source.fight_count),
      error: source.available === false ? String(source.reason || "fonte indisponível") : null,
    });
  }

  return {
    id: `verification:${row.id}`,
    category: "card",
    status,
    trigger: "cron",
    title: `Verificação automática do card (${String(row.verification_window).toUpperCase()})`,
    summary:
      row.status === "running"
        ? "Verificação em andamento"
        : row.status === "failed"
          ? "A verificação do card falhou"
          : `${changeCount} alteração(ões) encontrada(s)`,
    eventId: row.event_id,
    eventName: eventNames.get(row.event_id) || summary.event_name || null,
    createdAt: row.started_at || row.created_at,
    completedAt: row.completed_at || null,
    durationMs: completed && Number.isFinite(started) ? Math.max(0, completed - started) : null,
    sources,
    details: sanitizeLogDetails({
      verification_window: row.verification_window,
      scheduled_for: row.scheduled_for,
      summary,
    }) as Record<string, unknown>,
    error: row.error_message || null,
  };
}

export async function getAdminOperationLogs(limit = 250) {
  const adminSupabase = await getAdminSupabase();
  const safeLimit = Math.max(1, Math.min(limit, 500));

  const [{ data: activityRows, error: activityError }, { data: verificationRows, error: verificationError }] =
    await Promise.all([
      adminSupabase
        .from("activity_logs")
        .select("id, action, details, created_at")
        .in("action", OPERATION_ACTIONS)
        .order("created_at", { ascending: false })
        .limit(safeLimit),
      adminSupabase
        .from("card_verification_runs")
        .select("id, event_id, verification_window, scheduled_for, status, started_at, completed_at, summary, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(safeLimit),
    ]);

  if (activityError) throw activityError;
  if (verificationError) throw verificationError;

  const eventIds = new Set<string>();
  for (const row of activityRows || []) {
    const eventId = asRecord(row.details).event_id;
    if (typeof eventId === "string") eventIds.add(eventId);
  }
  for (const row of verificationRows || []) eventIds.add(row.event_id);

  const eventNames = new Map<string, string>();
  if (eventIds.size) {
    const { data: events, error } = await adminSupabase
      .from("events")
      .select("id, name")
      .in("id", Array.from(eventIds));
    if (error) throw error;
    for (const event of events || []) eventNames.set(event.id, event.name);
  }

  const seenResultRequests = new Set<string>();
  const deduplicatedActivityRows = (activityRows || []).filter((row) => {
    if (row.action !== "admin_sync_results") return true;
    const requestId = asRecord(row.details).request_id;
    if (typeof requestId !== "string" || !requestId) return true;
    if (seenResultRequests.has(requestId)) return false;
    seenResultRequests.add(requestId);
    return true;
  });

  return [
    ...deduplicatedActivityRows.map((row) => normalizeActivityLog(row, eventNames)),
    ...(verificationRows || []).map((row) => normalizeVerificationRun(row, eventNames)),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, safeLimit);
}
