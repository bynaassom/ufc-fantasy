"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import type {
  OperationLog,
  OperationLogCategory,
  OperationLogsResponse,
  OperationLogStatus,
} from "../operation-log-types";
import { adminGet, formatAdminDateTime, inp, sel } from "../shared";

const CATEGORY_LABELS: Record<OperationLogCategory, string> = {
  results: "Resultados",
  events: "Eventos",
  card: "Cards",
  odds: "Odds",
  system: "Sistema",
};

const STATUS_META: Record<
  OperationLogStatus,
  { label: string; color: string; background: string }
> = {
  success: { label: "Sucesso", color: "var(--green)", background: "rgba(34,197,94,0.10)" },
  warning: { label: "Atenção", color: "var(--yellow)", background: "rgba(202,138,4,0.12)" },
  error: { label: "Erro", color: "var(--red)", background: "rgba(232,0,26,0.10)" },
  running: { label: "Executando", color: "var(--blue)", background: "rgba(59,130,246,0.10)" },
  info: { label: "Informativo", color: "var(--text-secondary)", background: "var(--bg-elevated)" },
};

function RefreshIcon({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={spinning ? "animate-spin" : ""}
    >
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className="transition-transform group-open:rotate-180"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function formatDuration(value: number | null) {
  if (value === null) return null;
  if (value < 1_000) return `${value} ms`;
  if (value < 60_000) return `${(value / 1_000).toFixed(1)} s`;
  return `${Math.floor(value / 60_000)} min ${Math.round((value % 60_000) / 1_000)} s`;
}

function formatRelativeTime(value: string, referenceTime: string) {
  const seconds = Math.round(
    (new Date(value).getTime() - new Date(referenceTime).getTime()) / 1_000,
  );
  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div
      className="min-w-0 p-4"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <p className="font-condensed font-900 text-2xl leading-none" style={{ color: tone || "var(--text)" }}>
        {value}
      </p>
      <p className="mt-1 text-xs font-condensed font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
    </div>
  );
}

function LogEntry({ log, referenceTime }: { log: OperationLog; referenceTime: string }) {
  const status = STATUS_META[log.status];
  const duration = formatDuration(log.durationMs);

  async function copyDetails() {
    await navigator.clipboard.writeText(JSON.stringify(log.details, null, 2));
    toast.success("Detalhes copiados.");
  }

  return (
    <article
      className="relative overflow-hidden"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <span className="absolute inset-y-0 left-0 w-0.5" style={{ backgroundColor: status.color }} />
      <div className="px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-condensed font-800 uppercase tracking-widest"
                style={{ color: status.color, backgroundColor: status.background, border: `1px solid ${status.color}` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                {status.label}
              </span>
              <span
                className="px-2 py-1 text-[11px] font-condensed font-700 uppercase tracking-widest"
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >
                {CATEGORY_LABELS[log.category]}
              </span>
              <span className="text-[11px] font-condensed font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {log.trigger === "cron" ? "Cron-job.org" : log.trigger === "admin" ? "Admin" : "Sistema"}
              </span>
            </div>
            <h3 className="mt-3 font-condensed font-800 text-base uppercase tracking-wide" style={{ color: "var(--text)" }}>
              {log.title}
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {log.summary}
            </p>
            {log.error && (
              <p className="mt-2 break-words text-xs" style={{ color: "var(--red)" }}>
                {log.error}
              </p>
            )}
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <time
              dateTime={log.createdAt}
              title={formatAdminDateTime(log.createdAt)}
              className="text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              {formatRelativeTime(log.createdAt, referenceTime)}
            </time>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
              {formatAdminDateTime(log.createdAt)}
              {duration ? ` · ${duration}` : ""}
            </p>
          </div>
        </div>

        {(log.eventName || log.sources.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Contexto da execução">
            {log.eventName && (
              <span className="px-2.5 py-1.5 text-xs" style={{ color: "var(--text)", backgroundColor: "var(--bg-elevated)" }}>
                {log.eventName}
              </span>
            )}
            {log.sources.map((source, index) => (
              <span
                key={`${source.label}:${index}`}
                className="px-2.5 py-1.5 text-xs"
                title={source.error || source.url || undefined}
                style={{
                  color: source.error ? "var(--yellow)" : "var(--text-secondary)",
                  backgroundColor: "var(--bg-elevated)",
                }}
              >
                {source.label}
                {source.resultsCount !== null ? ` · ${source.resultsCount}` : ""}
                {source.error ? " · falhou" : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      <details className="group" style={{ borderTop: "1px solid var(--border-light)" }}>
        <summary
          className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-xs font-condensed font-700 uppercase tracking-widest transition-colors hover-bg-elevated sm:px-5"
          style={{ color: "var(--text-secondary)" }}
        >
          Detalhes técnicos
          <ChevronIcon />
        </summary>
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={copyDetails}
              className="cursor-pointer px-2.5 py-1.5 text-xs font-condensed font-700 uppercase tracking-widest transition-opacity hover:opacity-70"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              Copiar JSON
            </button>
          </div>
          <pre
            className="max-h-80 overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-relaxed"
            style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg)", border: "1px solid var(--border-light)" }}
          >
            {JSON.stringify(log.details, null, 2)}
          </pre>
        </div>
      </details>
    </article>
  );
}

export default function LogsTab() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [category, setCategory] = useState<OperationLogCategory | "all">("all");
  const [status, setStatus] = useState<OperationLogStatus | "all">("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);

  const loadLogs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const data = await adminGet<OperationLogsResponse>("/api/admin/operation-logs?limit=300");
      setLogs(data.logs || []);
      setGeneratedAt(data.generatedAt);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os logs.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => loadLogs({ silent: true }), 30_000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  useEffect(() => {
    setVisibleCount(30);
  }, [category, status, deferredSearch]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (category !== "all" && log.category !== category) return false;
      if (status !== "all" && log.status !== status) return false;
      if (!deferredSearch) return true;
      return [
        log.title,
        log.summary,
        log.eventName,
        log.error,
        log.trigger,
        ...log.sources.map((source) => source.label),
        JSON.stringify(log.details),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(deferredSearch);
    });
  }, [category, deferredSearch, logs, status]);

  const visibleLogs = filteredLogs.slice(0, visibleCount);
  const last24Hours = useMemo(() => {
    if (!generatedAt) return [];
    const cutoff = new Date(generatedAt).getTime() - 24 * 60 * 60 * 1_000;
    return logs.filter((log) => new Date(log.createdAt).getTime() >= cutoff);
  }, [generatedAt, logs]);

  const counts = {
    executions: last24Hours.length,
    success: last24Hours.filter((log) => log.status === "success").length,
    attention: last24Hours.filter((log) => log.status === "warning" || log.status === "running").length,
    errors: last24Hours.filter((log) => log.status === "error").length,
  };

  return (
    <section className="space-y-6" aria-labelledby="operation-logs-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="red-line !mb-2">
            <h2 id="operation-logs-title" className="section-title">Monitor de integrações</h2>
          </div>
          <p className="max-w-2xl text-sm" style={{ color: "var(--text-secondary)" }}>
            Acompanhe consultas ao UFC, verificações de card, sincronização de resultados e odds em um só lugar.
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }} aria-live="polite">
            {generatedAt ? `Atualizado ${formatRelativeTime(generatedAt, generatedAt)}` : "Aguardando primeira atualização"}
            {autoRefresh ? " · atualização automática a cada 30 s" : " · atualização automática pausada"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label
            className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-xs font-condensed font-700 uppercase tracking-widest"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
            />
            Auto atualizar
          </label>
          <button
            type="button"
            onClick={() => loadLogs()}
            disabled={loading}
            className="flex min-h-11 cursor-pointer items-center gap-2 px-4 font-condensed font-900 text-xs uppercase tracking-widest transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ color: "var(--text)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <RefreshIcon spinning={loading} />
            {loading ? "Atualizando" : "Atualizar"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Execuções · 24h" value={counts.executions} />
        <StatCard label="Sucessos" value={counts.success} tone="var(--green)" />
        <StatCard label="Atenção" value={counts.attention} tone="var(--yellow)" />
        <StatCard label="Erros" value={counts.errors} tone="var(--red)" />
      </div>

      <div
        className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_190px_190px]"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <label>
          <span className="sr-only">Buscar logs</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por evento, fonte, erro ou conteúdo"
            style={inp}
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por categoria</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as OperationLogCategory | "all")} style={sel}>
            <option value="all">Todas as categorias</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filtrar por status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as OperationLogStatus | "all")} style={sel}>
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_META).map(([value, meta]) => (
              <option key={value} value={value}>{meta.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" className="p-4 text-sm" style={{ color: "var(--red)", backgroundColor: "rgba(232,0,26,0.06)", border: "1px solid rgba(232,0,26,0.35)" }}>
          {error}
        </div>
      )}

      {loading && !logs.length ? (
        <div className="space-y-3" aria-label="Carregando logs">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-36 animate-pulse" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }} />
          ))}
        </div>
      ) : visibleLogs.length ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Exibindo {visibleLogs.length} de {filteredLogs.length} registro(s)
            </p>
          </div>
          <div className="space-y-3">
            {visibleLogs.map((log) => (
              <LogEntry key={log.id} log={log} referenceTime={generatedAt || log.createdAt} />
            ))}
          </div>
          {visibleLogs.length < filteredLogs.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((current) => current + 30)}
              className="min-h-11 cursor-pointer px-4 font-condensed font-900 text-xs uppercase tracking-widest transition-opacity hover:opacity-80"
              style={{ color: "var(--text)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              Carregar mais
            </button>
          )}
        </>
      ) : (
        <div className="p-8 text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="font-condensed font-800 uppercase tracking-wide" style={{ color: "var(--text)" }}>
            Nenhum registro encontrado
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Ajuste os filtros ou execute uma sincronização para gerar novos registros.
          </p>
        </div>
      )}
    </section>
  );
}
