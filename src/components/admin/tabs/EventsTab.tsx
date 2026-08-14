"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { groupAdminEvents } from "@/lib/admin-event-groups";
import toast from "react-hot-toast";

import {
  adminGet,
  adminSend,
  inp,
  sel,
  lbl,
  focus,
  blur,
  formatAdminDateTime,
  toEventEditForm,
  hasDatePassed,
  areEventPicksOpen,
  getBulkActionLabel,
  getBulkActionWarning,
  AdminEmptyState,
  WEIGHT_CLASSES,
  CARD_TYPES,
} from "../shared";
import type { EventEditForm, SubTab } from "../types";

// ─── Props ───────────────────────────────────────────────────
export default function EventsTab({
  subTab,
  sortedEvents,
  selectedEventId,
  setSelectedEventId,
  eventFights,
  loadFights,
  onOpenSection,
  onEventsChanged,
}: {
  subTab: SubTab;
  sortedEvents: any[];
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  eventFights: any[];
  loadFights: (eventId: string) => void;
  onOpenSection: (subTab: SubTab, eventId?: string) => void;
  onEventsChanged: () => void;
}) {
  switch (subTab) {
    case "evento-pendencias":
      return (
        <EventoPendencias
          sortedEvents={sortedEvents}
          onOpenSection={onOpenSection}
        />
      );
    case "evento-manual":
      return <EventoManual onEventsChanged={onEventsChanged} />;
    case "evento-editar":
      return (
        <EventoEditar
          sortedEvents={sortedEvents}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          eventFights={eventFights}
          loadFights={loadFights}
        />
      );
    case "ops-lote":
      return <OperacoesLote sortedEvents={sortedEvents} />;
    default:
      return null;
  }
}

// ─── EventoPendencias ────────────────────────────────────────
function EventoPendencias({
  sortedEvents,
  onOpenSection,
}: {
  sortedEvents: any[];
  onOpenSection: (subTab: SubTab, eventId?: string) => void;
}) {
  type PendingFight = {
    id: string;
    event_id: string;
    odds_a?: string | null;
    odds_b?: string | null;
    ufc_matchup_url?: string | null;
    event?: {
      id: string;
      name: string;
      status: string;
      event_date: string;
      picks_open_at?: string | null;
      picks_lock_at?: string | null;
      ufc_stats_url?: string | null;
      banner_image_url?: string | null;
    } | null;
    fighter_a?: { name?: string | null } | null;
    fighter_b?: { name?: string | null } | null;
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingFights, setPendingFights] = useState<PendingFight[]>([]);

  const loadPendingFights = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminGet<{ fights: PendingFight[] }>(
        "/api/admin/pending-fights",
      );
      setPendingFights((data.fights || []) as PendingFight[]);
    } catch (err) {
      setError(String(err));
      setPendingFights([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingFights();
  }, [loadPendingFights]);

  const fightCountByEvent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const fight of pendingFights) {
      counts.set(fight.event_id, (counts.get(fight.event_id) || 0) + 1);
    }
    return counts;
  }, [pendingFights]);

  const currentEvents = useMemo(
    () =>
      sortedEvents.filter(
        (event) => event.status === "upcoming" || event.status === "live",
      ),
    [sortedEvents],
  );

  const eventsWithoutFights = useMemo(
    () =>
      currentEvents.filter((event) => !fightCountByEvent.get(event.id)),
    [currentEvents, fightCountByEvent],
  );

  const eventsWithoutResultSources = useMemo(
    () =>
      currentEvents.filter(
        (event) =>
          !event.ufc_stats_url &&
          !event.ufc_event_id,
      ),
    [currentEvents],
  );

  const eventsWithoutBanner = useMemo(
    () => currentEvents.filter((event) => !event.banner_image_url),
    [currentEvents],
  );

  const openEventsWithoutFights = useMemo(
    () => eventsWithoutFights.filter((event) => areEventPicksOpen(event)),
    [eventsWithoutFights],
  );

  const overdueEvents = useMemo(
    () =>
      sortedEvents.filter(
        (event) =>
          event.status !== "completed" && hasDatePassed(event.event_date),
      ),
    [sortedEvents],
  );

  const fightsMissingOdds = useMemo(
    () =>
      pendingFights.filter(
        (fight) =>
          fight.event &&
          (fight.event.status === "upcoming" || fight.event.status === "live") &&
          (!fight.odds_a || !fight.odds_b),
      ),
    [pendingFights],
  );

  const fightsMissingLinks = useMemo(
    () =>
      pendingFights.filter(
        (fight) =>
          fight.event &&
          (fight.event.status === "upcoming" || fight.event.status === "live") &&
          !fight.ufc_matchup_url,
      ),
    [pendingFights],
  );

  const summary = [
    { label: "Eventos sem lutas", value: eventsWithoutFights.length },
    { label: "Picks abertos sem card", value: openEventsWithoutFights.length },
    { label: "Lutas sem odds", value: fightsMissingOdds.length },
    { label: "Lutas sem link UFC", value: fightsMissingLinks.length },
    { label: "Eventos sem fonte resultado", value: eventsWithoutResultSources.length },
    { label: "Eventos pendentes de resultado", value: overdueEvents.length },
  ];

  function Section({
    title,
    description,
    count,
    children,
  }: {
    title: string;
    description: string;
    count: number;
    children: React.ReactNode;
  }) {
    return (
      <section
        className="p-4 space-y-3"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              className="font-condensed font-700 text-sm uppercase"
              style={{ color: "var(--text)" }}
            >
              {title}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {description}
            </p>
          </div>
          <span
            className="px-2 py-1 text-xs font-condensed font-900 uppercase tracking-widest"
            style={{
              backgroundColor: count > 0 ? "rgba(232,0,26,0.1)" : "var(--bg-card)",
              border: `1px solid ${count > 0 ? "rgba(232,0,26,0.3)" : "var(--border)"}`,
              color: count > 0 ? "var(--red)" : "var(--text-muted)",
            }}
          >
            {count}
          </span>
        </div>
        {children}
      </section>
    );
  }

  function EmptyState({ text }: { text: string }) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {text}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        {summary.map((item) => (
          <div
            key={item.label}
            className="p-4"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="font-condensed font-900 text-2xl"
              style={{ color: item.value > 0 ? "var(--red)" : "var(--text)" }}
            >
              {item.value}
            </p>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={loadPendingFights}
          disabled={loading}
          className="px-4 py-2 font-condensed font-900 text-xs uppercase tracking-widest disabled:opacity-40"
          style={{
            backgroundColor: "var(--red)",
            color: "white",
          }}
        >
          {loading ? "ATUALIZANDO..." : "ATUALIZAR PENDÊNCIAS"}
        </button>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}

      <Section
        title="Eventos sem lutas"
        description="Eventos futuros cadastrados, mas ainda sem card montado."
        count={eventsWithoutFights.length}
      >
        {eventsWithoutFights.length === 0 ? (
          <EmptyState text="Nenhum evento sem lutas no momento." />
        ) : (
          <div className="space-y-3">
            {eventsWithoutFights.map((event) => (
              <div
                key={event.id}
                className="p-3 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {event.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatAdminDateTime(event.event_date)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => onOpenSection("lutas-nova", event.id)}
                  className="px-3 py-2 font-condensed font-900 text-xs uppercase tracking-widest"
                  style={{
                    backgroundColor: "var(--red)",
                    color: "white",
                  }}
                >
                  CRIAR LUTAS
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Picks abertos sem card"
        description="Eventos já abertos para palpites, mas sem nenhuma luta cadastrada."
        count={openEventsWithoutFights.length}
      >
        {openEventsWithoutFights.length === 0 ? (
          <EmptyState text="Nenhum evento com picks abertos está sem card." />
        ) : (
          <div className="space-y-3">
            {openEventsWithoutFights.map((event) => (
              <div
                key={event.id}
                className="p-3 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(232,0,26,0.3)",
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {event.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--red)" }}>
                    Picks abertos agora
                  </p>
                </div>
                <button
                  onClick={() => onOpenSection("lutas-nova", event.id)}
                  className="px-3 py-2 font-condensed font-900 text-xs uppercase tracking-widest"
                  style={{
                    backgroundColor: "var(--red)",
                    color: "white",
                  }}
                >
                  RESOLVER
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Lutas sem odds"
        description="Lutas futuras que ainda não têm odds completas."
        count={fightsMissingOdds.length}
      >
        {fightsMissingOdds.length === 0 ? (
          <EmptyState text="Nenhuma luta futura está sem odds." />
        ) : (
          <div className="space-y-3">
            {fightsMissingOdds.slice(0, 8).map((fight) => (
              <div
                key={fight.id}
                className="p-3 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {fight.fighter_a?.name || "?"} vs {fight.fighter_b?.name || "?"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {fight.event?.name}
                  </p>
                </div>
                <button
                  onClick={() => onOpenSection("lutas-odds", fight.event_id)}
                  className="px-3 py-2 font-condensed font-900 text-xs uppercase tracking-widest"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  ABRIR ODDS
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Lutas sem link UFC"
        description="Lutas futuras sem URL oficial do matchup."
        count={fightsMissingLinks.length}
      >
        {fightsMissingLinks.length === 0 ? (
          <EmptyState text="Nenhuma luta futura está sem link oficial." />
        ) : (
          <div className="space-y-3">
            {fightsMissingLinks.slice(0, 8).map((fight) => (
              <div
                key={fight.id}
                className="p-3 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {fight.fighter_a?.name || "?"} vs {fight.fighter_b?.name || "?"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {fight.event?.name}
                  </p>
                </div>
                <button
                  onClick={() => onOpenSection("lutas-links", fight.event_id)}
                  className="px-3 py-2 font-condensed font-900 text-xs uppercase tracking-widest"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  ABRIR LINKS
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Eventos sem fonte de resultado"
        description="Eventos atuais sem UFC.com ou UFCStats configurados."
        count={eventsWithoutResultSources.length}
      >
        {eventsWithoutResultSources.length === 0 ? (
          <EmptyState text="Todos os eventos atuais têm ao menos uma fonte de resultado." />
        ) : (
          <div className="space-y-3">
            {eventsWithoutResultSources.map((event) => (
              <div
                key={event.id}
                className="p-3 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {event.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatAdminDateTime(event.event_date)}
                  </p>
                </div>
                <button
                  onClick={() => onOpenSection("evento-editar", event.id)}
                  className="px-3 py-2 font-condensed font-900 text-xs uppercase tracking-widest"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  EDITAR EVENTO
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Eventos sem banner"
        description="Eventos atuais sem imagem de capa para o app."
        count={eventsWithoutBanner.length}
      >
        {eventsWithoutBanner.length === 0 ? (
          <EmptyState text="Todos os eventos atuais têm banner." />
        ) : (
          <div className="space-y-3">
            {eventsWithoutBanner.map((event) => (
              <div
                key={event.id}
                className="p-3 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {event.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatAdminDateTime(event.event_date)}
                  </p>
                </div>
                <button
                  onClick={() => onOpenSection("evento-editar", event.id)}
                  className="px-3 py-2 font-condensed font-900 text-xs uppercase tracking-widest"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  EDITAR EVENTO
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Resultados pendentes"
        description="Eventos cujo horário já passou, mas ainda não foram finalizados."
        count={overdueEvents.length}
      >
        {overdueEvents.length === 0 ? (
          <EmptyState text="Nenhum evento vencido está aguardando fechamento." />
        ) : (
          <div className="space-y-3">
            {overdueEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid rgba(232,0,26,0.3)",
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {event.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Evento em {formatAdminDateTime(event.event_date)}
                  </p>
                </div>
                <button
                  onClick={() => onOpenSection("res-manual", event.id)}
                  className="px-3 py-2 font-condensed font-900 text-xs uppercase tracking-widest"
                  style={{
                    backgroundColor: "var(--red)",
                    color: "white",
                  }}
                >
                  LANÇAR RESULTADOS
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── EventSelector ───────────────────────────────────────────
function EventSelector({
  sortedEvents,
  value,
  onChange,
}: {
  sortedEvents: any[];
  value: string;
  onChange: (id: string) => void;
}) {
  const groupedEvents = useMemo(
    () => groupAdminEvents(sortedEvents),
    [sortedEvents],
  );

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
        {groupedEvents.map((group) => (
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

// ─── EVENTOS: Manual ─────────────────────────────────────────
function EventoManual({ onEventsChanged }: { onEventsChanged: () => void }) {
  const [form, setForm] = useState({
    name: "",
    location: "",
    event_date: "",
    prelims_start_at: "",
    timing_mode: "automatic" as "automatic" | "manual",
    picks_lock_at: "",
    picks_open_at: "",
    banner_image_url: "",
    ufc_event_id: "",
    ufc_stats_url: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminSend("/api/admin/events", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Evento criado!");
      onEventsChanged();
      setForm({
        name: "",
        location: "",
        event_date: "",
        prelims_start_at: "",
        timing_mode: "automatic",
        picks_lock_at: "",
        picks_open_at: "",
        banner_image_url: "",
        ufc_event_id: "",
        ufc_stats_url: "",
      });
    } catch (error: any) {
      toast.error(error.message);
      return;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      {[
        {
          label: "Nome do Evento",
          key: "name",
          type: "text",
          required: true,
          placeholder: "UFC Fight Night: X vs Y",
        },
        {
          label: "Local",
          key: "location",
          type: "text",
          placeholder: "Arena, Cidade, País",
        },
        {
          label: "Data do Evento (UTC)",
          key: "event_date",
          type: "datetime-local",
          required: true,
        },
        {
          label: "Início das Preliminares (UTC)",
          key: "prelims_start_at",
          type: "datetime-local",
        },
        {
          label: "Controle dos horários",
          key: "timing_mode",
          type: "select",
          options: ["automatic", "manual"],
        },
        {
          label: "Picks fecham em (UTC)",
          key: "picks_lock_at",
          type: "datetime-local",
        },
        {
          label: "Picks abrem em (UTC)",
          key: "picks_open_at",
          type: "datetime-local",
        },
        {
          label: "Banner URL",
          key: "banner_image_url",
          type: "text",
          placeholder: "https://...",
        },
        {
          label: "URL UFC.com",
          key: "ufc_event_id",
          type: "text",
          placeholder: "https://www.ufc.com/event/...",
        },
        {
          label: "URL UFCStats",
          key: "ufc_stats_url",
          type: "text",
          placeholder: "http://www.ufcstats.com/event-details/...",
        },
      ].map(({ label, key, type, required, placeholder, options }) => (
        <div key={key}>
          <label className={lbl} style={{ color: "var(--text-secondary)" }}>
            {label}
          </label>
          {type === "select" ? (
            <select
              value={(form as any)[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              style={sel}
              onFocus={focus}
              onBlur={blur}
            >
              {options!.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              required={required}
              type={type}
              value={(form as any)[key]}
              placeholder={placeholder}
              disabled={key === "picks_lock_at" && form.timing_mode === "automatic"}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              style={{ ...inp, opacity: key === "picks_lock_at" && form.timing_mode === "automatic" ? 0.55 : 1 }}
              onFocus={focus}
              onBlur={blur}
            />
          )}
        </div>
      ))}
      <div
        className="border-l-2 px-4 py-3"
        style={{ borderColor: "var(--red)", background: "var(--bg-card)" }}
      >
        <p className="font-condensed text-xs font-700 uppercase tracking-widest">
          Checagem oficial automática
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          O ID da API é detectado pela URL do UFC.com. Card, horários, status e
          resultados são cruzados com o UFCStats.
        </p>
      </div>
      {form.timing_mode === "automatic" && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          O fechamento será calculado 30 minutos antes do início das preliminares.
        </p>
      )}
      <button
        type="submit"
        className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white"
        style={{ backgroundColor: "var(--red)" }}
      >
        CRIAR EVENTO
      </button>
    </form>
  );
}

// ─── EVENTOS: Editar ─────────────────────────────────────────
function EventoEditar({
  sortedEvents,
  selectedEventId,
  setSelectedEventId,
  eventFights,
  loadFights,
}: any) {
  const [editForm, setEditForm] = useState<EventEditForm | null>(null);
  const [fights, setFights] = useState<any[]>([]);
    const [editFight, setEditFight] = useState<{
      id: string;
      weight_class: string;
      card_type: string;
      is_title_fight: boolean;
      total_rounds: number;
    } | null>(null);
  const [saving, setSaving] = useState(false);
  const [diff, setDiff] = useState<any>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedEventId) return;
    adminGet<{ event: any }>(`/api/admin/events/${selectedEventId}`)
      .then(({ event: data }) => {
        setEditForm(toEventEditForm(data));
      })
      .catch((error: any) => {
        toast.error(error.message);
      });
  }, [selectedEventId]);

  useEffect(() => {
    setFights([...eventFights]);
  }, [eventFights]);

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { event } = await adminSend<{ event: any }>(
        `/api/admin/events/${selectedEventId}`,
        {
          method: "PATCH",
          body: JSON.stringify(editForm),
        },
      );
      setEditForm(toEventEditForm(event));
      toast.success("Evento atualizado!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFight(e: React.FormEvent) {
    e.preventDefault();
    if (!editFight) return;
    try {
      await adminSend(`/api/admin/fights/${editFight.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          weight_class: editFight.weight_class,
          card_type: editFight.card_type,
          is_title_fight: editFight.is_title_fight,
          total_rounds: editFight.total_rounds,
        }),
      });
    } catch (error: any) {
      toast.error(error.message);
      return;
    }
    toast.success("Luta atualizada!");
    setEditFight(null);
    loadFights(selectedEventId);
  }

  async function handleDeleteFight(fightId: string) {
    if (!confirm("Tem certeza que quer remover essa luta?")) return;
    try {
      await adminSend(`/api/admin/fights/${fightId}`, { method: "DELETE" });
    } catch (error: any) {
      toast.error(error.message);
      return;
    }
    toast.success("Luta removida!");
    loadFights(selectedEventId);
  }

  function handleDragStart(index: number) {
    dragItem.current = index;
  }
  function handleDragEnter(index: number) {
    dragOverItem.current = index;
  }
  async function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newFights = [...fights];
    const dragged = newFights.splice(dragItem.current, 1)[0];
    newFights.splice(dragOverItem.current, 0, dragged);

    await adminSend(`/api/admin/events/${selectedEventId}/fights/reorder`, {
      method: "POST",
      body: JSON.stringify({ fightIds: newFights.map((fight) => fight.id) }),
    });
    dragItem.current = null;
    dragOverItem.current = null;
    toast.success("Ordem atualizada!");
    loadFights(selectedEventId);
  }

  if (!editForm) return null;

  return (
    <div className="max-w-2xl space-y-8">
      <EventSelector
        sortedEvents={sortedEvents}
        value={selectedEventId}
        onChange={setSelectedEventId}
      />

      <form onSubmit={handleSaveEvent} className="space-y-4">
        <div className="red-line">
          <span className="section-title text-sm">DADOS DO EVENTO</span>
        </div>
        {[
          { label: "Nome", key: "name", type: "text" },
          { label: "Local", key: "location", type: "text" },
          {
            label: "Status",
            key: "status",
            type: "select",
            options: ["upcoming", "live", "completed"],
          },
          {
            label: "Data do Evento (UTC)",
            key: "event_date",
            type: "datetime-local",
          },
          {
            label: "Início das Preliminares (UTC)",
            key: "prelims_start_at",
            type: "datetime-local",
          },
          {
            label: "Controle dos horários",
            key: "timing_mode",
            type: "select",
            options: ["automatic", "manual"],
          },
          {
            label: "Picks fecham em (UTC)",
            key: "picks_lock_at",
            type: "datetime-local",
          },
          {
            label: "Picks abrem em (UTC)",
            key: "picks_open_at",
            type: "datetime-local",
          },
          { label: "Banner URL", key: "banner_image_url", type: "text" },
          { label: "URL UFC.com", key: "ufc_event_id", type: "text" },
          { label: "URL UFCStats", key: "ufc_stats_url", type: "text" },
          ].map(({ label, key, type, options }) => {
          const k = key as keyof EventEditForm;
          const updater = (val: string) => setEditForm((prev) => {
            if (!prev) return null;
            return { ...prev, [k]: val };
          });
          return (
          <div key={key}>
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              {label}
            </label>
            {type === "select" ? (
              <select
                value={editForm[k]}
                onChange={(e) => updater(e.target.value)}
                style={sel}
                onFocus={focus}
                onBlur={blur}
              >
                {options!.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                value={editForm[k]}
                disabled={key === "picks_lock_at" && editForm.timing_mode === "automatic"}
                onChange={(e) => updater(e.target.value)}
                style={{
                  ...inp,
                  opacity:
                    key === "picks_lock_at" && editForm.timing_mode === "automatic"
                      ? 0.55
                      : 1,
                }}
                onFocus={focus}
                onBlur={blur}
              />
            )}
          </div>
        )})}
        <div
          className="border-l-2 px-4 py-3"
          style={{ borderColor: "var(--red)", background: "var(--bg-card)" }}
        >
          <p className="font-condensed text-xs font-700 uppercase tracking-widest">
            Checagem oficial automática
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            O ID da API é detectado pela URL do UFC.com. Divergências com o
            UFCStats bloqueiam a importação automática do resultado.
          </p>
        </div>
        {editForm.timing_mode === "automatic" && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Picks fecham automaticamente 30 minutos antes das preliminares.
          </p>
        )}
        {editForm.banner_image_url && (
          <div>
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              POSIÇÃO DO BANNER
            </label>
            <div
              className="relative w-full h-32 overflow-hidden mb-2"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={editForm.banner_image_url}
                alt="Preview"
                className="w-full h-full object-cover"
                style={{ objectPosition: editForm.banner_object_position || "center" }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-condensed font-700 uppercase tracking-wider transition-all active:scale-95"
                style={{
                  backgroundColor:
                    editForm.banner_object_position === "center top"
                      ? "var(--red)"
                      : "var(--bg-elevated)",
                  color:
                    editForm.banner_object_position === "center top"
                      ? "#fff"
                      : "var(--text)",
                }}
                onClick={() =>
                  setEditForm((prev) =>
                    prev ? { ...prev, banner_object_position: "center top" } : null,
                  )
                }
              >
                ↑ Topo
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-condensed font-700 uppercase tracking-wider transition-all active:scale-95"
                style={{
                  backgroundColor:
                    editForm.banner_object_position === "center"
                      ? "var(--red)"
                      : "var(--bg-elevated)",
                  color:
                    editForm.banner_object_position === "center"
                      ? "#fff"
                      : "var(--text)",
                }}
                onClick={() =>
                  setEditForm((prev) =>
                    prev ? { ...prev, banner_object_position: "center" } : null,
                  )
                }
              >
                Centro
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-condensed font-700 uppercase tracking-wider transition-all active:scale-95"
                style={{
                  backgroundColor:
                    editForm.banner_object_position === "center bottom"
                      ? "var(--red)"
                      : "var(--bg-elevated)",
                  color:
                    editForm.banner_object_position === "center bottom"
                      ? "#fff"
                      : "var(--text)",
                }}
                onClick={() =>
                  setEditForm((prev) =>
                    prev ? { ...prev, banner_object_position: "center bottom" } : null,
                  )
                }
              >
                ↓ Base
              </button>
              <div className="flex-1" />
              <button
                type="button"
                className="px-2 py-1.5 text-xs font-condensed font-700 tracking-wider transition-all active:scale-95"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text)",
                }}
                onClick={() =>
                  setEditForm((prev) => {
                    if (!prev) return null;
                    const current = prev.banner_object_position || "center";
                    const match = current.match(/^center\s+(\d+)%/);
                    const pct = match ? parseInt(match[1]) : 50;
                    return {
                      ...prev,
                      banner_object_position: `center ${Math.max(0, pct - 10)}%`,
                    };
                  })
                }
              >
                -10%
              </button>
              <button
                type="button"
                className="px-2 py-1.5 text-xs font-condensed font-700 tracking-wider transition-all active:scale-95"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text)",
                }}
                onClick={() =>
                  setEditForm((prev) => {
                    if (!prev) return null;
                    const current = prev.banner_object_position || "center";
                    const match = current.match(/^center\s+(\d+)%/);
                    const pct = match ? parseInt(match[1]) : 50;
                    return {
                      ...prev,
                      banner_object_position: `center ${Math.min(100, pct + 10)}%`,
                    };
                  })
                }
              >
                +10%
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
          style={{ backgroundColor: "var(--red)" }}
        >
          {saving ? "SALVANDO..." : "SALVAR EVENTO"}
        </button>
      </form>

      <div className="space-y-3">
        <div className="red-line flex items-center justify-between">
          <span className="section-title text-sm">LUTAS</span>
          <span
            className="text-xs font-condensed"
            style={{ color: "var(--text-muted)" }}
          >
            arraste para reordenar
          </span>
        </div>

        {fights.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Nenhuma luta encontrada.
          </p>
        )}

        {fights.map((fight, index) => (
          <div key={fight.id}>
            {editFight?.id === fight.id ? (
              <form
                onSubmit={handleSaveFight}
                className="p-4 space-y-3"
                style={{
                  border: "1px solid var(--red)",
                  backgroundColor: "var(--bg-card)",
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className={lbl}
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Categoria
                    </label>
                    <select
                      value={editFight!.weight_class}
                      onChange={(e) =>
                        setEditFight((f: any) => ({
                          ...f,
                          weight_class: e.target.value,
                        }))
                      }
                      style={sel}
                      onFocus={focus}
                      onBlur={blur}
                    >
                      {WEIGHT_CLASSES.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className={lbl}
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Card
                    </label>
                    <select
                      value={editFight!.card_type}
                      onChange={(e) =>
                        setEditFight((f: any) => ({
                          ...f,
                          card_type: e.target.value,
                        }))
                      }
                      style={sel}
                      onFocus={focus}
                      onBlur={blur}
                    >
                      {CARD_TYPES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className={lbl}
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Rounds
                    </label>
                    <select
                      value={editFight!.total_rounds}
                      onChange={(e) =>
                        setEditFight((f: any) => ({
                          ...f,
                          total_rounds: parseInt(e.target.value),
                        }))
                      }
                      style={sel}
                      onFocus={focus}
                      onBlur={blur}
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFight!.is_title_fight}
                        onChange={(e) =>
                          setEditFight((f: any) => ({
                            ...f,
                            is_title_fight: e.target.checked,
                          }))
                        }
                      />
                      <span
                        className="font-condensed font-600 text-xs uppercase tracking-widest"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Disputa de Título
                      </span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 font-condensed font-700 text-xs uppercase tracking-widest text-white"
                    style={{ backgroundColor: "var(--red)" }}
                  >
                    SALVAR
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFight(null)}
                    className="px-4 py-2 font-condensed font-700 text-xs uppercase tracking-widest"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    CANCELAR
                  </button>
                </div>
              </form>
            ) : (
              <div
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-card)",
                  transition: "background-color 0.15s",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ color: "var(--text-muted)", flexShrink: 0 }}
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>

                <div className="flex-1 min-w-0">
                  <p
                    className="font-condensed font-700 text-sm uppercase truncate"
                    style={{ color: "var(--text)" }}
                  >
                    {fight.fighter_a?.name} vs {fight.fighter_b?.name}
                  </p>
                  <p
                    className="font-condensed font-600 text-xs uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {fight.weight_class} ·{" "}
                    {fight.card_type === "main"
                      ? "Main"
                      : fight.card_type === "preliminary"
                        ? "Prelim"
                        : "Early"}{" "}
                    #{fight.fight_order}
                    {fight.is_title_fight && " · 🏆"}
                    {fight.result_confirmed && " · ✓"}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditFight({ ...fight })}
                    className="font-condensed font-600 text-xs uppercase tracking-widest px-2 py-1 transition-opacity hover:opacity-70"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    EDITAR
                  </button>
                  <button
                    onClick={() => handleDeleteFight(fight.id)}
                    className="font-condensed font-600 text-xs uppercase tracking-widest px-2 py-1 transition-opacity hover:opacity-70"
                    style={{
                      border: "1px solid var(--red)",
                      color: "var(--red)",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="space-y-4 pt-6"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="red-line flex items-center justify-between">
          <span className="section-title text-sm">ATUALIZAR CARD</span>
          <button
            type="button"
            onClick={async () => {
              setDiffLoading(true);
              setDiff(null);
              setRemoveIds([]);
              try {
                const res = await fetch("/api/update-card", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ event_id: selectedEventId }),
                });
                const data = await res.json();
                if (!res.ok) {
                  toast.error(data.error);
                } else {
                  setDiff(data);
                }
              } catch (e: any) {
                toast.error(e.message);
              }
              setDiffLoading(false);
            }}
            disabled={diffLoading}
            className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40 transition-opacity hover:opacity-80"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text)",
              backgroundColor: "var(--bg-elevated)",
            }}
          >
            {diffLoading ? "BUSCANDO..." : "↻ VERIFICAR MUDANÇAS"}
          </button>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Re-scrapa a página do UFC.com e detecta lutas novas, removidas ou
          alteradas.
        </p>

        {diff && (
          <div className="space-y-4">
            {diff.added?.length > 0 && (
              <div
                className="p-4 space-y-2"
                style={{
                  border: "1px solid #22c55e33",
                  backgroundColor: "#22c55e08",
                }}
              >
                <p
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{ color: "#22c55e" }}
                >
                  {diff.added.length} LUTA(S) NOVA(S) — serão adicionadas
                  automaticamente
                </p>
                {diff.added.map((f: any, i: number) => (
                  <p
                    key={i}
                    className="text-xs font-condensed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    + {f.fighter_a} vs {f.fighter_b} · {f.weight_class} ·{" "}
                    {f.card_type}
                  </p>
                ))}
              </div>
            )}

            {diff.removed?.length > 0 && (
              <div
                className="p-4 space-y-3"
                style={{
                  border: "1px solid var(--red)",
                  backgroundColor: "rgba(232,0,26,0.05)",
                }}
              >
                <p
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{ color: "var(--red)" }}
                >
                  {diff.removed.length} LUTA(S) REMOVIDA(S) DO CARD — selecione
                  o que deletar
                </p>
                {diff.removed.map((f: any) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={removeIds.includes(f.id)}
                      onChange={(e) =>
                        setRemoveIds((ids) =>
                          e.target.checked
                            ? [...ids, f.id]
                            : ids.filter((id) => id !== f.id),
                        )
                      }
                    />
                    <div>
                      <p
                        className="text-xs font-condensed font-700 uppercase"
                        style={{ color: "var(--text)" }}
                      >
                        {f.fighter_a} vs {f.fighter_b}
                      </p>
                      <p
                        className="text-xs font-condensed"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {f.picks_count > 0
                          ? `${f.picks_count} pick(s) serão deletados`
                          : "Sem picks"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {diff.updated?.length > 0 && (
              <div
                className="p-4 space-y-2"
                style={{
                  border: "1px solid rgba(234,179,8,0.3)",
                  backgroundColor: "rgba(234,179,8,0.05)",
                }}
              >
                <p
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{ color: "#ca8a04" }}
                >
                  {diff.updated.length} LUTA(S) ALTERADA(S) — serão atualizadas
                  automaticamente
                </p>
                {diff.updated.map((f: any, i: number) => (
                  <div key={i}>
                    <p
                      className="text-xs font-condensed font-700"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {f.fighter_a} vs {f.fighter_b}
                    </p>
                    {Object.entries(f.changes).map(([key, val]: any) => (
                      <p
                        key={key}
                        className="text-xs font-condensed"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {key}: {val.from} → {val.to}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {diff.added?.length === 0 &&
              diff.removed?.length === 0 &&
              diff.updated?.length === 0 && (
                <p
                  className="text-sm font-condensed"
                  style={{ color: "var(--text-muted)" }}
                >
                  Nenhuma mudança detectada — card está atualizado ✓
                </p>
              )}

            {(diff.added?.length > 0 ||
              diff.updated?.length > 0 ||
              removeIds.length > 0) && (
              <button
                type="button"
                disabled={applying}
                onClick={async () => {
                  setApplying(true);
                  try {
                    const res = await fetch("/api/update-card", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        event_id: selectedEventId,
                        confirm_removals: true,
                        remove_ids: removeIds,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      toast.error(data.error);
                    } else {
                      toast.success(
                        `Card atualizado! ${data.log?.length || 0} mudança(s) aplicada(s)`,
                      );
                      setDiff(null);
                      setRemoveIds([]);
                      loadFights(selectedEventId);
                    }
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                  setApplying(false);
                }}
                className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
                style={{ backgroundColor: "var(--red)" }}
              >
                {applying ? "APLICANDO..." : "APLICAR MUDANÇAS"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── OPERAÇÕES: Ações em Lote ──────────────────────────────────
function OperacoesLote({ sortedEvents }: { sortedEvents: any[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [action, setAction] = useState<
    "open_now" | "close_now" | "reset_default" | "set_offsets" | "set_status"
  >("open_now");
  const [openHoursBefore, setOpenHoursBefore] = useState(12);
  const [lockMinutesBefore, setLockMinutesBefore] = useState(30);
  const [status, setStatus] = useState<"upcoming" | "live" | "completed">(
    "upcoming",
  );
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const currentEvents = useMemo(
    () =>
      sortedEvents.filter(
        (event) => event.status === "upcoming" || event.status === "live",
      ),
    [sortedEvents],
  );

  function toggleSelection(eventId: string) {
    setSelectedIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId],
    );
  }

  function selectEvents(kind: "current" | "upcoming" | "live" | "none") {
    if (kind === "none") {
      setSelectedIds([]);
      return;
    }

    const filtered =
      kind === "current"
        ? currentEvents
        : sortedEvents.filter((event) => event.status === kind);
    setSelectedIds(filtered.map((event) => event.id));
  }

  const selectedEvents = sortedEvents.filter((event) => selectedIds.includes(event.id));

  async function runBulkAction(dryRun: boolean) {
    if (!selectedIds.length) {
      toast.error("Selecione pelo menos um evento.");
      return;
    }

    if (!dryRun && !confirm(getBulkActionWarning(action, selectedIds.length))) {
      return;
    }

    setLoading(true);
    if (dryRun) {
      setPreview(null);
    } else {
      setResult(null);
    }

    try {
      const res = await fetch("/api/admin/bulk-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dry_run: dryRun,
          event_ids: selectedIds,
          action,
          open_hours_before: openHoursBefore,
          lock_minutes_before: lockMinutesBefore,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao aplicar ação em lote");
        return;
      }

      if (dryRun) {
        setPreview(data);
        toast.success(data.message);
      } else {
        setResult(data);
        toast.success(data.message);
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="p-4 space-y-4"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            Eventos Selecionados
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Abra/feche picks, redefina janelas padrão ou altere o status em
            lote.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            {selectedIds.length === 0
              ? "Nenhum evento selecionado."
              : `${selectedIds.length} ${selectedIds.length === 1 ? "evento selecionado" : "eventos selecionados"}.`}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => selectEvents("current")}
            className="px-3 py-1.5 font-condensed font-700 text-xs uppercase tracking-widest"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Atual + Live
          </button>
          <button
            onClick={() => selectEvents("upcoming")}
            className="px-3 py-1.5 font-condensed font-700 text-xs uppercase tracking-widest"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Upcoming
          </button>
          <button
            onClick={() => selectEvents("live")}
            className="px-3 py-1.5 font-condensed font-700 text-xs uppercase tracking-widest"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Live
          </button>
          <button
            onClick={() => selectEvents("none")}
            className="px-3 py-1.5 font-condensed font-700 text-xs uppercase tracking-widest"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            Limpar
          </button>
        </div>

        {sortedEvents.length === 0 ? (
          <AdminEmptyState text="Nenhum evento disponível para operação em lote." />
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {sortedEvents.map((event) => {
              const checked = selectedIds.includes(event.id);
              return (
                <label
                  key={event.id}
                  className="flex items-start gap-3 p-3 cursor-pointer"
                  style={{
                    backgroundColor: checked
                      ? "rgba(232,0,26,0.06)"
                      : "var(--bg-card)",
                    border: `1px solid ${checked ? "var(--red)" : "var(--border)"}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelection(event.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--text)" }}
                    >
                      {event.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatAdminDateTime(event.event_date)} · {event.status}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="p-4 space-y-4"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            Ação em Lote
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            A ação atual vai {getBulkActionLabel(action)} nos eventos selecionados.
          </p>
        </div>

        <div>
          <label className={lbl} style={{ color: "var(--text-secondary)" }}>
            Ação
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as any)}
            style={sel}
            onFocus={focus}
            onBlur={blur}
          >
            <option value="open_now">Abrir picks agora</option>
            <option value="close_now">Fechar picks agora</option>
            <option value="reset_default">Resetar janela padrão</option>
            <option value="set_offsets">Definir offsets customizados</option>
            <option value="set_status">Alterar status</option>
          </select>
        </div>

        {(action === "set_offsets" || action === "reset_default") && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl} style={{ color: "var(--text-secondary)" }}>
                Picks abrem X horas antes
              </label>
              <input
                type="number"
                value={openHoursBefore}
                onChange={(e) => setOpenHoursBefore(parseInt(e.target.value || "0", 10))}
                style={inp}
                onFocus={focus}
                onBlur={blur}
              />
            </div>
            <div>
              <label className={lbl} style={{ color: "var(--text-secondary)" }}>
                Picks fecham X min antes
              </label>
              <input
                type="number"
                value={lockMinutesBefore}
                onChange={(e) =>
                  setLockMinutesBefore(parseInt(e.target.value || "0", 10))
                }
                style={inp}
                onFocus={focus}
                onBlur={blur}
              />
            </div>
          </div>
        )}

        {action === "set_status" && (
          <div>
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              Novo Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              style={sel}
              onFocus={focus}
              onBlur={blur}
            >
              <option value="upcoming">upcoming</option>
              <option value="live">live</option>
              <option value="completed">completed</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => runBulkAction(true)}
            disabled={loading || selectedIds.length === 0}
            className="py-3 font-condensed font-900 text-sm uppercase tracking-widest disabled:opacity-40"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            {loading ? "PROCESSANDO..." : "VER PRÉVIA"}
          </button>
          <button
            onClick={() => runBulkAction(false)}
            disabled={loading || selectedIds.length === 0}
            className="py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--red)" }}
          >
            {loading ? "PROCESSANDO..." : "APLICAR AÇÃO"}
          </button>
        </div>
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
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            {preview.message}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {selectedEvents.length === 0
              ? "Nenhum evento selecionado na prévia."
              : selectedEvents.map((event) => event.name).join(" · ")}
          </p>
          {preview.changes?.map((change: any) => (
            <p
              key={change.id}
              className="text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              ↻ {change.name} · {JSON.stringify(change.update)}
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
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            {result.message}
          </p>
          {result.applied?.map((name: string) => (
            <p
              key={name}
              className="text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              ✓ {name}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
