"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  inp,
  lbl,
  focus,
  blur,
} from "../shared";

// ─── Props ───────────────────────────────────────────────────
export default function SyncTab({
  onEventsChanged,
}: {
  onEventsChanged: () => void;
}) {
  return <EventoImportar onEventsChanged={onEventsChanged} />;
}

// ─── EVENTOS: Importar ───────────────────────────────────────
function EventoImportar({ onEventsChanged }: { onEventsChanged: () => void }) {
  type SyncAction = "create" | "update" | "unchanged";
  type MatchStrategy =
    | "ufc_event_id"
    | "slug"
    | "date_matchup"
    | "matchup_time_window"
    | "date_only"
    | null;
  type UpcomingSyncEvent = {
    source_id: string;
    name: string;
    slug: string;
    event_url: string;
    event_date: string;
    location: string;
    action: SyncAction;
    matched_by: MatchStrategy;
    existing_event: {
      id: string;
      name: string;
      slug: string;
      event_date: string;
      ufc_event_id?: string | null;
    } | null;
  };

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [syncingUpcoming, setSyncingUpcoming] = useState(false);
  const [sql, setSql] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingSyncEvent[]>([]);
  const [selectedUpcomingIds, setSelectedUpcomingIds] = useState<string[]>([]);
  const [syncResult, setSyncResult] = useState<{
    message: string;
    created: string[];
    updated: string[];
    unchanged: string[];
    card_synced: string[];
    card_pending: string[];
    card_errors: string[];
    card_added_count: number;
    card_updated_count: number;
  } | null>(null);

  const actionLabels: Record<SyncAction, string> = {
    create: "NOVO",
    update: "ATUALIZAR",
    unchanged: "SEM MUDANÇA",
  };

  const actionColors: Record<SyncAction, React.CSSProperties> = {
    create: {
      backgroundColor: "rgba(34,197,94,0.12)",
      border: "1px solid rgba(34,197,94,0.35)",
      color: "#22c55e",
    },
    update: {
      backgroundColor: "rgba(232,0,26,0.1)",
      border: "1px solid rgba(232,0,26,0.3)",
      color: "var(--red)",
    },
    unchanged: {
      backgroundColor: "var(--bg-card)",
      border: "1px solid var(--border)",
      color: "var(--text-muted)",
    },
  };

  const selectedCount = selectedUpcomingIds.length;

  function generateSql(d: { event: any; fights: any[] }): string {
    const { event, fights } = d;
    const slug = (event.name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const eventDate = event.event_date || "";
    const picksLockAt = event.picks_lock_at || "";
    const picksOpenAt = eventDate
      ? new Date(
          new Date(eventDate).getTime() - 12 * 60 * 60 * 1000,
        ).toISOString()
      : "NOW()";
    const lines = [
      "-- ============================================================",
      `-- ${event.name}`,
      "-- ============================================================\n",
      "-- 1. Evento",
      `INSERT INTO events (id, name, slug, event_date, location, banner_image_url, status, picks_lock_at, picks_open_at)`,
      `VALUES (`,
      `  gen_random_uuid(),`,
      `  '${(event.name || "").replace(/'/g, "''")}',`,
      `  '${slug}',`,
      `  '${eventDate}',`,
      `  '${(event.location || "").replace(/'/g, "''")}',`,
      `  '${event.banner_image_url || ""}',`,
      `  'upcoming',`,
      `  '${picksLockAt}',`,
      `  '${picksOpenAt}'`,
      `);\n`,
      "-- 2. Lutadores e Lutas",
    ];
    fights.forEach((f, i) => {
      const fa = f.fighter_a;
      const fb = f.fighter_b;
      lines.push(`-- Luta ${i + 1}: ${fa.name} vs ${fb.name}`);
      lines.push(
        `INSERT INTO fighters (id, name, headshot_url, country) VALUES (gen_random_uuid(), '${fa.name.replace(/'/g, "''")}', '${fa.headshot_url || ""}', '${(fa.country || "").replace(/'/g, "''")}') ON CONFLICT (name) DO NOTHING;`,
      );
      lines.push(
        `INSERT INTO fighters (id, name, headshot_url, country) VALUES (gen_random_uuid(), '${fb.name.replace(/'/g, "''")}', '${fb.headshot_url || ""}', '${(fb.country || "").replace(/'/g, "''")}') ON CONFLICT (name) DO NOTHING;`,
      );
      lines.push(
        `INSERT INTO fights (event_id, fighter_a_id, fighter_b_id, card_type, fight_order, weight_class, is_title_fight, total_rounds, ufc_matchup_url)\nVALUES (\n  (SELECT id FROM events WHERE slug = '${slug}'),\n  (SELECT id FROM fighters WHERE name = '${fa.name.replace(/'/g, "''")}'),\n  (SELECT id FROM fighters WHERE name = '${fb.name.replace(/'/g, "''")}'),\n  '${f.card_type}', ${f.fight_order}, '${f.weight_class}', ${f.is_title_fight}, ${f.total_rounds},\n  ${f.ufc_matchup_url ? `'${f.ufc_matchup_url}'` : "NULL"}\n);\n`,
      );
    });
    return lines.join("\n");
  }

  async function handleScrape() {
    if (!url.trim()) {
      toast.error("Cole uma URL válida.");
      return;
    }
    setLoading(true);
    setSql("");
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/scrape-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro desconhecido");
        return;
      }
      setData(json);
      setSql(generateSql(json));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  const loadUpcomingEventsPreview = useCallback(async () => {
    setLoadingUpcoming(true);
    setError("");
    try {
      const res = await fetch("/api/sync-events");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro ao carregar próximos eventos");
        setUpcomingEvents([]);
        setSelectedUpcomingIds([]);
        return;
      }

      const events = (json.events || []) as UpcomingSyncEvent[];
      setUpcomingEvents(events);
      setSelectedUpcomingIds(
        events
          .filter((event) => event.action === "create" || event.action === "update")
          .map((event) => event.source_id),
      );
    } catch (err) {
      setError(String(err));
      setUpcomingEvents([]);
      setSelectedUpcomingIds([]);
    } finally {
      setLoadingUpcoming(false);
    }
  }, []);

  useEffect(() => {
    loadUpcomingEventsPreview();
  }, [loadUpcomingEventsPreview]);

  function toggleUpcomingSelection(sourceId: string) {
    setSelectedUpcomingIds((current) =>
      current.includes(sourceId)
        ? current.filter((id) => id !== sourceId)
        : [...current, sourceId],
    );
  }

  function selectUpcomingByAction(actions: SyncAction[]) {
    setSelectedUpcomingIds(
      upcomingEvents
        .filter((event) => actions.includes(event.action))
        .map((event) => event.source_id),
    );
  }

  async function handleSyncUpcomingEvents() {
    if (!selectedUpcomingIds.length) {
      toast.error("Selecione pelo menos um evento.");
      return;
    }

    setSyncingUpcoming(true);
    setError("");
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedEventIds: selectedUpcomingIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro ao sincronizar eventos");
        return;
      }
      setSyncResult(json);
      toast.success("Eventos sincronizados!");
      await loadUpcomingEventsPreview();
      onEventsChanged();
    } catch (err) {
      setError(String(err));
    } finally {
      setSyncingUpcoming(false);
    }
  }

  function formatUpcomingEventDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div
        className="p-4 space-y-3"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="font-condensed font-700 text-sm uppercase"
          style={{ color: "var(--text)" }}
        >
          Sincronizar próximos eventos
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Busca os próximos eventos no UFC, compara com a sua base e deixa você
          escolher em lote o que criar ou atualizar.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={loadUpcomingEventsPreview}
            disabled={loadingUpcoming || syncingUpcoming}
            className="flex-1 min-w-[180px] py-3 font-condensed font-900 text-sm uppercase tracking-widest disabled:opacity-40"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            {loadingUpcoming ? "CARREGANDO..." : "ATUALIZAR LISTA"}
          </button>
          <button
            onClick={handleSyncUpcomingEvents}
            disabled={syncingUpcoming || selectedCount === 0}
            className="flex-1 min-w-[180px] py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--red)" }}
          >
            {syncingUpcoming
              ? "SINCRONIZANDO..."
              : `SINCRONIZAR SELECIONADOS (${selectedCount})`}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => selectUpcomingByAction(["create", "update"])}
            className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-1.5 transition-all hover:opacity-80"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Selecionar Novos + Updates
          </button>
          <button
            onClick={() => selectUpcomingByAction(["create"])}
            className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-1.5 transition-all hover:opacity-80"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Só Novos
          </button>
          <button
            onClick={() => setSelectedUpcomingIds([])}
            className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-1.5 transition-all hover:opacity-80"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            Limpar
          </button>
        </div>
        <div className="space-y-2">
          {loadingUpcoming ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Carregando próximos eventos...
            </p>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Nenhum evento futuro encontrado.
            </p>
          ) : (
            upcomingEvents.map((event) => {
              const checked = selectedUpcomingIds.includes(event.source_id);
              return (
                <label
                  key={event.source_id}
                  className="block p-3 cursor-pointer transition-all hover:opacity-90"
                  style={{
                    backgroundColor: checked
                      ? "rgba(232,0,26,0.06)"
                      : "var(--bg-card)",
                    border: `1px solid ${checked ? "var(--red)" : "var(--border)"}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUpcomingSelection(event.source_id)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className="font-condensed font-700 text-sm uppercase"
                          style={{ color: "var(--text)" }}
                        >
                          {event.name}
                        </p>
                        <span
                          className="px-2 py-0.5 text-[10px] font-condensed font-900 uppercase tracking-widest"
                          style={actionColors[event.action]}
                        >
                          {actionLabels[event.action]}
                        </span>
                      </div>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {formatUpcomingEventDate(event.event_date)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                      {event.existing_event && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Já existe: {event.existing_event.name}
                          {event.matched_by ? ` · match por ${event.matched_by}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>

      {syncResult && (
        <div
          className="p-4 space-y-2"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            {syncResult.message}
          </p>
          {syncResult.created.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Criados: {syncResult.created.join(" · ")}
            </p>
          )}
          {syncResult.updated.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Atualizados: {syncResult.updated.join(" · ")}
            </p>
          )}
          {syncResult.unchanged.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sem mudança: {syncResult.unchanged.join(" · ")}
            </p>
          )}
          {(syncResult.card_added_count > 0 || syncResult.card_updated_count > 0) && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Cards: +{syncResult.card_added_count} luta(s) nova(s) · ~
              {syncResult.card_updated_count} atualizada(s)
            </p>
          )}
          {syncResult.card_synced.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Cards sincronizados: {syncResult.card_synced.join(" · ")}
            </p>
          )}
          {syncResult.card_pending.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Card pendente: {syncResult.card_pending.join(" · ")}
            </p>
          )}
          {syncResult.card_errors.length > 0 && (
            <p className="text-xs" style={{ color: "var(--red)" }}>
              Erros no card: {syncResult.card_errors.join(" · ")}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className={lbl} style={{ color: "var(--text-secondary)" }}>
            URL do Evento no UFC.com
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.ufc.com.br/event/ufc-fight-night-march-28-2026"
            style={inp}
            onFocus={focus}
            onBlur={blur}
          />
        </div>
        <button
          onClick={handleScrape}
          disabled={loading}
          className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
          style={{ backgroundColor: "var(--red)" }}
        >
          {loading ? "IMPORTANDO..." : "IMPORTAR EVENTO"}
        </button>
      </div>
      {error && (
        <p className="text-sm" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}
      {data && (
        <div
          className="p-4 space-y-1"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            {data.event.name}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {data.event.location} · {data.fights.length} lutas encontradas
          </p>
        </div>
      )}
      {sql && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              SQL Gerado
            </label>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sql);
                toast.success("SQL copiado!");
              }}
              className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-1.5 transition-all hover:opacity-80"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              COPIAR
            </button>
          </div>
          <textarea
            readOnly
            value={sql}
            rows={12}
            style={{
              ...inp,
              fontFamily: "monospace",
              fontSize: "11px",
              resize: "vertical",
            }}
          />
        </div>
      )}
    </div>
  );
}
