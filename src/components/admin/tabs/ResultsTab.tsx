"use client";

import { useState, useEffect } from "react";
import { groupAdminEvents } from "@/lib/admin-event-groups";
import toast from "react-hot-toast";

import {
  adminSend,
  adminGet,
  inp,
  sel,
  lbl,
  focus,
  blur,
  AdminEmptyState,
} from "../shared";
import type { SubTab } from "../types";

// ─── Props ───────────────────────────────────────────────────
export default function ResultsTab({
  subTab,
  sortedEvents,
  selectedEventId,
  setSelectedEventId,
  eventFights,
  loadFights,
}: {
  subTab: SubTab;
  sortedEvents: any[];
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  eventFights: any[];
  loadFights: (eventId: string) => void;
}) {
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  async function loadSyncLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch(
        "/api/admin/audit-logs?action=admin_sync_results",
      );
      const data = await res.json();
      if (data.logs) setSyncLogs(data.logs);
    } catch {
      // ignora
    }
    setLogsLoading(false);
  }

  useEffect(() => {
    loadSyncLogs();
  }, []);

  return (
    <div className="space-y-6">
      <SyncHistory
        logs={syncLogs}
        loading={logsLoading}
        onLoad={loadSyncLogs}
      />
      {subTab === "res-auto" && (
        <ResAutoSync
          sortedEvents={sortedEvents}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          loadFights={loadFights}
          onSyncComplete={loadSyncLogs}
        />
      )}
      {subTab === "res-manual" && (
        <ResManual
          sortedEvents={sortedEvents}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          eventFights={eventFights}
          loadFights={loadFights}
        />
      )}
    </div>
  );
}

// ─── EventSelector (local) ───────────────────────────────────
function EventSelector({
  sortedEvents,
  value,
  onChange,
}: {
  sortedEvents: any[];
  value: string;
  onChange: (id: string) => void;
}) {
  const groupedEvents = (() => groupAdminEvents(sortedEvents))();

  return (
    <div>
      <label className={lbl} style={{ color: "var(--text-secondary)" }}>
        Evento
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={sel}
        onFocus={focus}
        onBlur={blur}
      >
        {groupedEvents.map((group: any) => (
          <optgroup key={group.label} label={group.label}>
            {group.events.map((ev: any) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

// ─── RESULTADOS: Auto-Sync ───────────────────────────────────
function ResAutoSync({
  sortedEvents,
  selectedEventId,
  setSelectedEventId,
  loadFights,
  onSyncComplete,
}: any) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/sync-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: selectedEventId, dry_run: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        setLoading(false);
        return;
      }
      setPreview(data);
      toast.success(data.message);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  async function handleSync(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: selectedEventId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        setLoading(false);
        return;
      }
      setResult(data);
      toast.success(data.message);
      loadFights(selectedEventId);
      onSyncComplete?.();
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSync} className="max-w-lg space-y-4">
      <EventSelector
        sortedEvents={sortedEvents}
        value={selectedEventId}
        onChange={setSelectedEventId}
      />
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        As fontes de resultado são configuradas na aba{" "}
        <strong>Eventos → Editar</strong>. O sync busca e compara resultados
        automaticamente.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading}
          className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest disabled:opacity-40"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          {loading ? "BUSCANDO..." : "VER PRÉVIA"}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ backgroundColor: "var(--red)" }}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              IMPORTANDO...
            </>
          ) : (
            "IMPORTAR RESULTADOS"
          )}
        </button>
      </div>
      {preview && (
        <div
          className="p-4 space-y-2"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="font-condensed font-700 text-sm"
            style={{ color: "var(--text)" }}
          >
            {preview.message}
          </p>
          {preview.results?.map((item: string, index: number) => (
            <p
              key={index}
              className="text-xs font-condensed"
              style={{ color: "var(--text-secondary)" }}
            >
              ↻ {item}
            </p>
          ))}
        </div>
      )}
      {result && (
        <div
          className="p-4 space-y-2"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="font-condensed font-700 text-sm"
            style={{ color: "var(--red)" }}
          >
            {result.message}
          </p>
          {result.results?.map((r: string, i: number) => (
            <p
              key={i}
              className="text-xs font-condensed"
              style={{ color: "var(--text-secondary)" }}
            >
              ✓ {r}
            </p>
          ))}
        </div>
      )}
    </form>
  );
}

// ─── RESULTADOS: Manual ──────────────────────────────────────
function ResManual({
  sortedEvents,
  selectedEventId,
  setSelectedEventId,
  eventFights,
  loadFights,
}: any) {
  const [fightId, setFightId] = useState("");
  const [form, setForm] = useState({
    winner_side: "a" as "a" | "b",
    method: "decision" as "decision" | "submission" | "knockout",
    round: 1,
  });

  const fight = eventFights.find((f: any) => f.id === fightId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fight) {
      toast.error("Selecione uma luta.");
      return;
    }
    try {
      await adminSend(`/api/admin/fights/${fightId}/result`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Resultado inserido e picks pontuados!");
      loadFights(selectedEventId);
      setFightId("");
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <EventSelector
        sortedEvents={sortedEvents}
        value={selectedEventId}
        onChange={(id) => {
          setSelectedEventId(id);
          setFightId("");
        }}
      />
      <div>
        <label className={lbl} style={{ color: "var(--text-secondary)" }}>
          Luta
        </label>
        <select
          value={fightId}
          onChange={(e) => setFightId(e.target.value)}
          style={sel}
          onFocus={focus}
          onBlur={blur}
        >
          <option value="">Selecione…</option>
          {eventFights.map((f: any) => (
            <option key={f.id} value={f.id} disabled={f.result_confirmed}>
              {f.fighter_a?.name} vs {f.fighter_b?.name}
              {f.result_confirmed ? " ✓" : ""}
            </option>
          ))}
        </select>
      </div>
      {fight && (
        <>
          <div>
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              Vencedor
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["a", "b"] as const).map((side) => (
                <button
                  type="button"
                  key={side}
                  onClick={() => setForm((f) => ({ ...f, winner_side: side }))}
                  className="py-3 font-condensed font-900 text-sm uppercase tracking-wide transition-all"
                  style={{
                    backgroundColor:
                      form.winner_side === side
                        ? "var(--red)"
                        : "var(--bg-elevated)",
                    color: form.winner_side === side ? "white" : "var(--text)",
                    border: `1px solid ${form.winner_side === side ? "var(--red)" : "var(--border)"}`,
                  }}
                >
                  {fight[`fighter_${side}`]?.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              Método
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { v: "decision", l: "Decisão" },
                  { v: "submission", l: "Finalização" },
                  { v: "knockout", l: "Nocaute" },
                ] as const
              ).map(({ v, l }) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setForm((f) => ({ ...f, method: v }))}
                  className="py-3 font-condensed font-900 text-xs uppercase tracking-widest transition-all"
                  style={{
                    backgroundColor:
                      form.method === v ? "var(--red)" : "var(--bg-elevated)",
                    color: form.method === v ? "white" : "var(--text)",
                    border: `1px solid ${form.method === v ? "var(--red)" : "var(--border)"}`,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          {form.method !== "decision" && (
            <div>
              <label className={lbl} style={{ color: "var(--text-secondary)" }}>
                Round
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setForm((f) => ({ ...f, round: r }))}
                    className="w-12 h-12 font-condensed font-900 text-sm transition-all"
                    style={{
                      backgroundColor:
                        form.round === r ? "var(--red)" : "var(--bg-elevated)",
                      color: form.round === r ? "white" : "var(--text)",
                      border: `1px solid ${form.round === r ? "var(--red)" : "var(--border)"}`,
                    }}
                  >
                    R{r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <button
        type="submit"
        disabled={!fightId}
        className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
        style={{ backgroundColor: "var(--red)" }}
      >
        CONFIRMAR RESULTADO
      </button>
    </form>
  );
}

// ─── Histórico de Sync ─────────────────────────────────────
const STEP_LABELS: Record<string, string> = {
  received: "Requisição recebida",
  rejected: "Recusado",
  no_active_event: "Nenhum evento ativo",
  outside_window: "Fora da janela do evento",
  no_event_id: "Nenhum event_id",
  event_not_found: "Evento não encontrado",
  no_fights: "Nenhuma luta no evento",
  no_scraped_results: "Raspagem sem resultados",
  no_consensus: "Sem consenso entre fontes",
  dry_run: "Prévia (dry run)",
  complete: "Sync concluído",
};

function SyncHistory({
  logs,
  loading,
  onLoad,
}: {
  logs: any[];
  loading: boolean;
  onLoad: () => void;
}) {
  return (
    <div
      className="p-4 space-y-3"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="font-condensed font-700 text-sm uppercase tracking-widest"
          style={{ color: "var(--text)" }}
        >
          Últimos syncs (cron + admin)
        </p>
        <button
          onClick={onLoad}
          disabled={loading}
          className="text-xs font-condensed font-700 uppercase tracking-widest transition-opacity hover:opacity-70 disabled:opacity-40"
          style={{ color: "var(--red)" }}
        >
          {loading ? "CARREGANDO..." : "ATUALIZAR"}
        </button>
      </div>

      {!logs.length && !loading && (
        <p className="text-xs" style={{ color: "var(--red)" }}>
          Nenhum sync registrado — a rota /api/sync-results nunca foi chamada
          (nem pelo cron nem pelo admin).
        </p>
      )}

      {loading && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Carregando...
        </p>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {logs.slice(0, 20).map((log: any) => {
          const details = log.details || {};
          const time = log.created_at
            ? new Date(log.created_at).toLocaleString("pt-BR")
            : "—";
          const step = details.step as string;
          const stepLabel = STEP_LABELS[step] || step || "Sync";
          const isExternal = details.is_external === true;
          const hasSources = Array.isArray(details.sources);
          const failedSources = hasSources
            ? details.sources.filter((s: any) => s.error)
            : [];
          const showRejected = step === "rejected";

          return (
            <div
              key={log.id}
              className="flex items-start gap-3 text-xs"
              style={{
                color: "var(--text-secondary)",
                borderLeft: `2px solid ${
                  showRejected
                    ? "var(--red)"
                    : step === "complete"
                      ? "var(--green)"
                      : "var(--border)"
                }`,
                paddingLeft: 8,
              }}
            >
              <span
                className="shrink-0 font-mono whitespace-nowrap"
                style={{ color: "var(--text-muted)" }}
              >
                {time}
              </span>
              <div className="min-w-0 space-y-0.5">
                <p
                  className="font-condensed font-700 truncate"
                  style={{
                    color: showRejected
                      ? "var(--red)"
                      : step === "complete"
                        ? "var(--green)"
                        : "var(--text)",
                  }}
                >
                  {isExternal ? "🔁 " : "👤 "}
                  {stepLabel}
                </p>
                {details.reason && (
                  <p style={{ color: "var(--red)" }}>Motivo: {details.reason}</p>
                )}
                {details.scraped_count !== undefined && (
                  <p style={{ color: "var(--text-muted)" }}>
                    {details.scraped_count} resultado(s) encontrados
                    {details.imported_count !== undefined &&
                      ` · ${details.imported_count} importado(s)`}
                  </p>
                )}
                {details.conflicts > 0 && (
                  <p style={{ color: "var(--yellow)" }}>
                    ⚠ {details.conflicts} conflito(s)
                  </p>
                )}
                {failedSources.length > 0 && (
                  <p style={{ color: "var(--text-muted)" }}>
                    Fontes com erro:{" "}
                    {failedSources.map((s: any) => s.label).join(", ")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
