"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import FighterSearchInput from "./FighterSearchInput";

// ─── Types ───────────────────────────────────────────────────
type MainTab = "eventos" | "lutas" | "resultados" | "operacoes" | "usuarios";
type SubTab =
  | "evento-pendencias"
  | "evento-manual"
  | "evento-importar"
  | "evento-editar"
  | "lutas-nova"
  | "lutas-odds"
  | "lutas-links"
  | "res-auto"
  | "res-manual"
  | "ops-lote"
  | "ops-fighters"
  | "ops-fotos"
  | "ops-auditoria"
  | "usuarios";

interface FighterData {
  name: string;
  headshot_url: string;
  country: string;
}
interface FightForm {
  fighter_a: FighterData;
  fighter_b: FighterData;
  weight_class: string;
  is_title_fight: boolean;
  total_rounds: number;
  card_type: string;
  fight_order: number;
}

const WEIGHT_CLASSES = [
  "Heavyweight",
  "LightHeavyweight",
  "Middleweight",
  "Welterweight",
  "Lightweight",
  "Featherweight",
  "Bantamweight",
  "Flyweight",
  "Strawweight",
  "Atomweight",
  "Catchweight",
];
const CARD_TYPES = [
  { value: "main", label: "Main Card" },
  { value: "preliminary", label: "Preliminares" },
];

const inp: React.CSSProperties = {
  backgroundColor: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  padding: "10px 14px",
  fontSize: "14px",
  transition: "border-color 0.15s",
};
const sel: React.CSSProperties = { ...inp, cursor: "pointer" };
const lbl =
  "block text-xs font-condensed font-700 uppercase tracking-widest mb-1.5";

const focus = (
  e: React.FocusEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >,
) => (e.target.style.borderColor = "var(--red)");
const blur = (
  e: React.FocusEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >,
) => (e.target.style.borderColor = "var(--border)");

function formatAdminDateTime(value?: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function hasDatePassed(value?: string | null) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

function areEventPicksOpen(event: {
  picks_open_at?: string | null;
  picks_lock_at?: string | null;
}) {
  const open = !event.picks_open_at || hasDatePassed(event.picks_open_at);
  const locked = !!event.picks_lock_at && hasDatePassed(event.picks_lock_at);
  return open && !locked;
}

function getBulkActionLabel(
  action: "open_now" | "close_now" | "reset_default" | "set_offsets" | "set_status",
) {
  const labels = {
    open_now: "abrir picks agora",
    close_now: "fechar picks agora",
    reset_default: "resetar a janela padrão",
    set_offsets: "aplicar offsets customizados",
    set_status: "alterar o status",
  };

  return labels[action];
}

function getBulkActionWarning(
  action: "open_now" | "close_now" | "reset_default" | "set_offsets" | "set_status",
  selectedCount: number,
) {
  const eventLabel = selectedCount === 1 ? "evento" : "eventos";
  return `Confirma ${getBulkActionLabel(action)} em ${selectedCount} ${eventLabel}?`;
}

function AdminEmptyState({ text }: { text: string }) {
  return (
    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
      {text}
    </p>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function AdminClient({
  events,
  users,
}: {
  events: any[];
  users: any[];
}) {
  const [mainTab, setMainTab] = useState<MainTab>("eventos");
  const [subTab, setSubTab] = useState<SubTab>("evento-manual");

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          new Date(b.event_date).getTime() - new Date(a.event_date).getTime(),
      ),
    [events],
  );

  const [selectedEventId, setSelectedEventId] = useState(
    sortedEvents[0]?.id || "",
  );
  const [eventFights, setEventFights] = useState<any[]>([]);
  const [userList, setUserList] = useState(users);

  useEffect(() => {
    if (selectedEventId) loadFights(selectedEventId);
  }, [selectedEventId]);

  async function loadFights(eventId: string) {
    const sb = createClient();
    const { data } = await sb
      .from("fights")
      .select(
        "id, card_type, fight_order, weight_class, is_title_fight, total_rounds, result_confirmed, odds_a, odds_b, ufc_matchup_url, fighter_a:fighters!fighter_a_id(id,name), fighter_b:fighters!fighter_b_id(id,name)",
      )
      .eq("event_id", eventId)
      .order("card_type")
      .order("fight_order");
    setEventFights(data || []);
  }

  function switchMain(t: MainTab, sub: SubTab) {
    setMainTab(t);
    setSubTab(sub);
  }

  function openAdminSection(sub: SubTab, eventId?: string) {
    if (eventId) setSelectedEventId(eventId);

    const owner = nav.find((item) => item.subs.some((child) => child.key === sub));
    if (owner) {
      setMainTab(owner.key);
      setSubTab(sub);
      return;
    }

    setMainTab("usuarios");
    setSubTab("usuarios");
  }

  // ── Nav config ───────────────────────────────────────────────
  const nav: {
    key: MainTab;
    label: string;
    subs: { key: SubTab; label: string }[];
  }[] = [
    {
      key: "eventos",
      label: "EVENTOS",
      subs: [
        { key: "evento-pendencias", label: "Pendências" },
        { key: "evento-manual", label: "Manual" },
        { key: "evento-importar", label: "Importar" },
        { key: "evento-editar", label: "Editar" },
      ],
    },
    {
      key: "lutas",
      label: "LUTAS",
      subs: [
        { key: "lutas-nova", label: "Nova Luta" },
        { key: "lutas-odds", label: "Odds" },
        { key: "lutas-links", label: "Links UFC" },
      ],
    },
    {
      key: "resultados",
      label: "RESULTADOS",
      subs: [
        { key: "res-auto", label: "Auto-Sync" },
        { key: "res-manual", label: "Manual" },
      ],
    },
    {
      key: "operacoes",
      label: "OPERAÇÕES",
      subs: [
        { key: "ops-lote", label: "Ações em Lote" },
        { key: "ops-fighters", label: "Mesclar Lutadores" },
        { key: "ops-fotos", label: "Fotos" },
        { key: "ops-auditoria", label: "Auditoria" },
      ],
    },
    { key: "usuarios", label: "USUÁRIOS", subs: [] },
  ];

  return (
    <div>
      {/* ── Main tabs ── */}
      <div
        className="flex gap-0 mb-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {nav.map((n) => (
          <button
            key={n.key}
            onClick={() =>
              switchMain(n.key, n.subs[0]?.key || ("usuarios" as SubTab))
            }
            className="relative font-condensed font-700 text-xs uppercase tracking-widest px-6 py-3 transition-all"
            style={{
              color: mainTab === n.key ? "var(--red)" : "var(--text-muted)",
            }}
          >
            {n.label}
            {mainTab === n.key && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: "var(--red)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Sub tabs ── */}
      {nav.find((n) => n.key === mainTab)?.subs.length ? (
        <div
          className="flex gap-0 mb-8"
          style={{
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--bg-elevated)",
          }}
        >
          {nav
            .find((n) => n.key === mainTab)!
            .subs.map((s) => (
              <button
                key={s.key}
                onClick={() => setSubTab(s.key)}
                className="font-condensed font-600 text-xs uppercase tracking-widest px-5 py-2.5 transition-all relative"
                style={{
                  color: subTab === s.key ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {s.label}
                {subTab === s.key && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: "var(--red)" }}
                  />
                )}
              </button>
            ))}
        </div>
      ) : (
        <div className="mb-8" />
      )}

      {/* ── Content ── */}
      {subTab === "evento-pendencias" && (
        <EventoPendencias
          sortedEvents={sortedEvents}
          onOpenSection={openAdminSection}
        />
      )}
      {subTab === "evento-manual" && (
        <EventoManual sortedEvents={sortedEvents} />
      )}
      {subTab === "evento-importar" && <EventoImportar />}
      {subTab === "evento-editar" && (
        <EventoEditar
          sortedEvents={sortedEvents}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          eventFights={eventFights}
          loadFights={loadFights}
        />
      )}
      {subTab === "lutas-nova" && (
        <LutasNova
          sortedEvents={sortedEvents}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          loadFights={loadFights}
        />
      )}
      {subTab === "lutas-odds" && (
        <LutasOdds
          sortedEvents={sortedEvents}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          eventFights={eventFights}
          loadFights={loadFights}
        />
      )}
      {subTab === "lutas-links" && (
        <LutasLinks
          sortedEvents={sortedEvents}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          eventFights={eventFights}
          loadFights={loadFights}
        />
      )}
      {subTab === "res-auto" && (
        <ResAutoSync
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          sortedEvents={sortedEvents}
          loadFights={loadFights}
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
      {subTab === "ops-auditoria" && (
        <OperacoesAuditoria users={userList} />
      )}
      {subTab === "ops-lote" && (
        <OperacoesLote sortedEvents={sortedEvents} />
      )}
      {subTab === "ops-fighters" && <OperacoesFighters />}
      {subTab === "ops-fotos" && <OperacoesFotos />}
      {(subTab === "usuarios" || mainTab === "usuarios") && (
        <Usuarios userList={userList} setUserList={setUserList} />
      )}
    </div>
  );
}

// ─── Shared EventSelector ────────────────────────────────────
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

  useEffect(() => {
    loadPendingFights();
  }, []);

  async function loadPendingFights() {
    setLoading(true);
    setError("");
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from("fights")
        .select(
          "id, event_id, odds_a, odds_b, ufc_matchup_url, fighter_a:fighters!fighter_a_id(name), fighter_b:fighters!fighter_b_id(name), event:events!inner(id, name, status, event_date, picks_open_at, picks_lock_at, ufc_stats_url, banner_image_url)",
        )
        .order("event_id");

      if (error) {
        setError(error.message);
        setPendingFights([]);
        return;
      }

      const normalized = (data || []).map((fight: any) => ({
        ...fight,
        fighter_a: Array.isArray(fight.fighter_a)
          ? fight.fighter_a[0] || null
          : fight.fighter_a,
        fighter_b: Array.isArray(fight.fighter_b)
          ? fight.fighter_b[0] || null
          : fight.fighter_b,
        event: Array.isArray(fight.event) ? fight.event[0] || null : fight.event,
      }));

      setPendingFights(normalized as PendingFight[]);
    } catch (err) {
      setError(String(err));
      setPendingFights([]);
    } finally {
      setLoading(false);
    }
  }

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

  const eventsWithoutStats = useMemo(
    () =>
      currentEvents.filter((event) => !event.ufc_stats_url),
    [currentEvents],
  );

  const eventsWithoutBanner = useMemo(
    () =>
      currentEvents.filter((event) => !event.banner_image_url),
    [currentEvents],
  );

  const openEventsWithoutFights = useMemo(
    () => eventsWithoutFights.filter((event) => areEventPicksOpen(event)),
    [eventsWithoutFights],
  );

  const overdueEvents = useMemo(
    () =>
      sortedEvents.filter(
        (event) => event.status !== "completed" && hasDatePassed(event.event_date),
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
    { label: "Eventos sem UFCStats", value: eventsWithoutStats.length },
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
        title="Eventos sem UFCStats"
        description="Eventos atuais ainda sem a URL de stats oficial."
        count={eventsWithoutStats.length}
      >
        {eventsWithoutStats.length === 0 ? (
          <EmptyState text="Todos os eventos atuais têm UFCStats URL." />
        ) : (
          <div className="space-y-3">
            {eventsWithoutStats.map((event) => (
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

function EventSelector({
  sortedEvents,
  value,
  onChange,
}: {
  sortedEvents: any[];
  value: string;
  onChange: (id: string) => void;
}) {
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
        {sortedEvents.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── EVENTOS: Manual ─────────────────────────────────────────
function EventoManual({ sortedEvents }: { sortedEvents: any[] }) {
  const [form, setForm] = useState({
    name: "",
    location: "",
    event_date: "",
    picks_lock_at: "",
    picks_open_at: "",
    banner_image_url: "",
    ufc_stats_url: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sb = createClient();
    const slug = form.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const { error } = await sb
      .from("events")
      .insert({ ...form, slug, status: "upcoming" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Evento criado!");
    setForm({
      name: "",
      location: "",
      event_date: "",
      picks_lock_at: "",
      picks_open_at: "",
      banner_image_url: "",
      ufc_stats_url: "",
    });
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
          label: "URL UFCStats",
          key: "ufc_stats_url",
          type: "text",
          placeholder: "http://www.ufcstats.com/event-details/...",
        },
      ].map(({ label, key, type, required, placeholder }) => (
        <div key={key}>
          <label className={lbl} style={{ color: "var(--text-secondary)" }}>
            {label}
          </label>
          <input
            required={required}
            type={type}
            value={(form as any)[key]}
            placeholder={placeholder}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            style={inp}
            onFocus={focus}
            onBlur={blur}
          />
        </div>
      ))}
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

// ─── EVENTOS: Importar ───────────────────────────────────────
function EventoImportar() {
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

  useEffect(() => {
    loadUpcomingEventsPreview();
  }, []);

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

  async function loadUpcomingEventsPreview() {
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
  }

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

// ─── EVENTOS: Editar ─────────────────────────────────────────
function EventoEditar({
  sortedEvents,
  selectedEventId,
  setSelectedEventId,
  eventFights,
  loadFights,
}: any) {
  const [eventData, setEventData] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [fights, setFights] = useState<any[]>([]);
  const [editFight, setEditFight] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [diff, setDiff] = useState<any>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Carrega evento completo
  useEffect(() => {
    if (!selectedEventId) return;
    const sb = createClient();
    sb.from("events")
      .select("*")
      .eq("id", selectedEventId)
      .single()
      .then(({ data }) => {
        setEventData(data);
        setEditForm({
          name: data?.name || "",
          location: data?.location || "",
          event_date: data?.event_date ? data.event_date.slice(0, 16) : "",
          picks_lock_at: data?.picks_lock_at
            ? data.picks_lock_at.slice(0, 16)
            : "",
          picks_open_at: data?.picks_open_at
            ? data.picks_open_at.slice(0, 16)
            : "",
          banner_image_url: data?.banner_image_url || "",
          ufc_stats_url: data?.ufc_stats_url || "",
          status: data?.status || "upcoming",
        });
      });
  }, [selectedEventId]);

  // Atualiza lista de lutas quando eventFights muda
  useEffect(() => {
    setFights([...eventFights]);
  }, [eventFights]);

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from("events")
      .update(editForm)
      .eq("id", selectedEventId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Evento atualizado!");
  }

  async function handleSaveFight(e: React.FormEvent) {
    e.preventDefault();
    if (!editFight) return;
    const sb = createClient();
    const { error } = await sb
      .from("fights")
      .update({
        weight_class: editFight.weight_class,
        card_type: editFight.card_type,
        is_title_fight: editFight.is_title_fight,
        total_rounds: editFight.total_rounds,
      })
      .eq("id", editFight.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Luta atualizada!");
    setEditFight(null);
    loadFights(selectedEventId);
  }

  async function handleDeleteFight(fightId: string) {
    if (!confirm("Tem certeza que quer remover essa luta?")) return;
    const sb = createClient();
    const { error } = await sb.from("fights").delete().eq("id", fightId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Luta removida!");
    loadFights(selectedEventId);
  }

  // Drag and drop reorder
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

    // Atualiza fight_order mantendo card_type
    const sb = createClient();
    const mainFights = newFights.filter((f) => f.card_type === "main");
    const prelimFights = newFights.filter((f) => f.card_type === "preliminary");

    const updates: Promise<any>[] = [];
    [...mainFights, ...prelimFights].forEach((f) => {
      const sameCard = newFights.filter((x) => x.card_type === f.card_type);
      const orderInCard = sameCard.indexOf(f) + 1;
      updates.push(
        sb
          .from("fights")
          .update({ fight_order: orderInCard })
          .eq("id", f.id) as unknown as Promise<any>,
      );
    });

    await Promise.all(updates);
    dragItem.current = null;
    dragOverItem.current = null;
    toast.success("Ordem atualizada!");
    loadFights(selectedEventId);
  }

  if (!editForm) return null;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Seletor de evento */}
      <EventSelector
        sortedEvents={sortedEvents}
        value={selectedEventId}
        onChange={setSelectedEventId}
      />

      {/* Dados do evento */}
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
          { label: "URL UFCStats", key: "ufc_stats_url", type: "text" },
        ].map(({ label, key, type, options }) => (
          <div key={key}>
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              {label}
            </label>
            {type === "select" ? (
              <select
                value={editForm[key]}
                onChange={(e) =>
                  setEditForm((f: any) => ({ ...f, [key]: e.target.value }))
                }
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
                value={editForm[key]}
                onChange={(e) =>
                  setEditForm((f: any) => ({ ...f, [key]: e.target.value }))
                }
                style={inp}
                onFocus={focus}
                onBlur={blur}
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
          style={{ backgroundColor: "var(--red)" }}
        >
          {saving ? "SALVANDO..." : "SALVAR EVENTO"}
        </button>
      </form>

      {/* Lista de lutas com drag and drop */}
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
            {/* Card da luta */}
            {editFight?.id === fight.id ? (
              // Modo edição inline
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
                      value={editFight.weight_class}
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
                      value={editFight.card_type}
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
                      value={editFight.total_rounds}
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
                        checked={editFight.is_title_fight}
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
              // Modo visualização com drag handle
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
                {/* Drag handle */}
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

                {/* Info */}
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

                {/* Actions */}
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

      {/* Atualizar Card */}
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
            {/* Lutas novas */}
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

            {/* Lutas removidas */}
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

            {/* Lutas alteradas */}
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

// ─── LUTAS: Nova Luta ────────────────────────────────────────
function LutasNova({
  sortedEvents,
  selectedEventId,
  setSelectedEventId,
  loadFights,
}: any) {
  const [form, setForm] = useState<FightForm>({
    fighter_a: { name: "", headshot_url: "", country: "" },
    fighter_b: { name: "", headshot_url: "", country: "" },
    weight_class: "Lightweight",
    is_title_fight: false,
    total_rounds: 3,
    card_type: "main",
    fight_order: 1,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fighter_a.name || !form.fighter_b.name) {
      toast.error("Preencha os dois lutadores.");
      return;
    }
    if (!selectedEventId) {
      toast.error("Selecione um evento.");
      return;
    }
    const sb = createClient();
    const ids: { a: string; b: string } = { a: "", b: "" };
    for (const side of ["a", "b"] as const) {
      const f = form[`fighter_${side}`];
      const { data: existing } = await sb
        .from("fighters")
        .select("id")
        .eq("name", f.name)
        .limit(1)
        .single();
      if (existing) {
        if (f.headshot_url)
          await sb
            .from("fighters")
            .update({ headshot_url: f.headshot_url, country: f.country })
            .eq("id", existing.id);
        ids[side] = existing.id;
      } else {
        const { data, error } = await sb
          .from("fighters")
          .insert({
            name: f.name,
            headshot_url: f.headshot_url,
            country: f.country,
          })
          .select("id")
          .single();
        if (error) {
          toast.error(`Erro: ${error.message}`);
          return;
        }
        ids[side] = data.id;
      }
    }
    const { error } = await sb.from("fights").insert({
      event_id: selectedEventId,
      fighter_a_id: ids.a,
      fighter_b_id: ids.b,
      weight_class: form.weight_class,
      is_title_fight: form.is_title_fight,
      total_rounds: form.total_rounds,
      card_type: form.card_type,
      fight_order: form.fight_order,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Luta adicionada!`);
    setForm((f) => ({
      ...f,
      fighter_a: { name: "", headshot_url: "", country: "" },
      fighter_b: { name: "", headshot_url: "", country: "" },
      fight_order: f.fight_order + 1,
    }));
    loadFights(selectedEventId);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <EventSelector
        sortedEvents={sortedEvents}
        value={selectedEventId}
        onChange={setSelectedEventId}
      />
      {(["a", "b"] as const).map((side) => (
        <div
          key={side}
          className="p-4 space-y-3"
          style={{
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-card)",
          }}
        >
          <p
            className="font-condensed font-700 text-xs uppercase tracking-widest"
            style={{ color: "var(--red)" }}
          >
            Lutador {side.toUpperCase()}
          </p>
          <FighterSearchInput
            label={`Lutador ${side.toUpperCase()}`}
            value={form[`fighter_${side}`]}
            onChange={(data) =>
              setForm((f) => ({
                ...f,
                [`fighter_${side}`]: {
                  name: data.name,
                  headshot_url: data.headshot_url || "",
                  country: data.country || "",
                },
              }))
            }
          />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl} style={{ color: "var(--text-secondary)" }}>
            Categoria
          </label>
          <select
            value={form.weight_class}
            onChange={(e) =>
              setForm((f) => ({ ...f, weight_class: e.target.value }))
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
          <label className={lbl} style={{ color: "var(--text-secondary)" }}>
            Card
          </label>
          <select
            value={form.card_type}
            onChange={(e) =>
              setForm((f) => ({ ...f, card_type: e.target.value }))
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
        <div>
          <label className={lbl} style={{ color: "var(--text-secondary)" }}>
            Rounds
          </label>
          <select
            value={form.total_rounds}
            onChange={(e) =>
              setForm((f) => ({ ...f, total_rounds: parseInt(e.target.value) }))
            }
            style={sel}
            onFocus={focus}
            onBlur={blur}
          >
            <option value={3}>3</option>
            <option value={5}>5</option>
          </select>
        </div>
        <div>
          <label className={lbl} style={{ color: "var(--text-secondary)" }}>
            Ordem
          </label>
          <input
            type="number"
            min={1}
            value={form.fight_order}
            onChange={(e) =>
              setForm((f) => ({ ...f, fight_order: parseInt(e.target.value) }))
            }
            style={inp}
            onFocus={focus}
            onBlur={blur}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_title_fight}
          onChange={(e) =>
            setForm((f) => ({ ...f, is_title_fight: e.target.checked }))
          }
        />
        <span
          className="font-condensed font-600 text-xs uppercase tracking-widest"
          style={{ color: "var(--text-secondary)" }}
        >
          Disputa de Título
        </span>
      </label>
      <button
        type="submit"
        className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white"
        style={{ backgroundColor: "var(--red)" }}
      >
        ADICIONAR LUTA
      </button>
    </form>
  );
}

// ─── LUTAS: Odds ─────────────────────────────────────────────
function LutasOdds({
  sortedEvents,
  selectedEventId,
  setSelectedEventId,
  eventFights,
  loadFights,
}: any) {
  const [fightId, setFightId] = useState("");
  const [form, setForm] = useState({ odds_a: "", odds_b: "" });
  const [bulkOdds, setBulkOdds] = useState<
    Record<string, { odds_a: string; odds_b: string }>
  >({});
  const [sync, setSync] = useState<{ loading: boolean; msg: string }>({
    loading: false,
    msg: "",
  });
  const [preview, setPreview] = useState<{
    matches: any[];
    skipped: any[];
    message: string;
  } | null>(null);

  useEffect(() => {
    const nextState = Object.fromEntries(
      eventFights.map((fight: any) => [
        fight.id,
        {
          odds_a: fight.odds_a || "",
          odds_b: fight.odds_b || "",
        },
      ]),
    );
    setBulkOdds(nextState);
  }, [eventFights]);

  useEffect(() => {
    if (!fightId) {
      setForm({ odds_a: "", odds_b: "" });
      return;
    }

    const selectedFight = eventFights.find((fight: any) => fight.id === fightId);
    setForm({
      odds_a: selectedFight?.odds_a || "",
      odds_b: selectedFight?.odds_b || "",
    });
  }, [fightId, eventFights]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fightId) {
      toast.error("Selecione uma luta.");
      return;
    }
    const sb = createClient();
    const { error } = await sb
      .from("fights")
      .update({ odds_a: form.odds_a || null, odds_b: form.odds_b || null })
      .eq("id", fightId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Odds salvas!");
    setFightId("");
    setForm({ odds_a: "", odds_b: "" });
    loadFights(selectedEventId);
  }

  async function handleSaveAllOdds() {
    const sb = createClient();
    const changed = eventFights.filter((fight: any) => {
      const current = bulkOdds[fight.id];
      if (!current) return false;
      return (
        (fight.odds_a || "") !== current.odds_a || (fight.odds_b || "") !== current.odds_b
      );
    });

    if (!changed.length) {
      toast.error("Nenhuma mudança de odds para salvar.");
      return;
    }

    if (
      !confirm(
        `Salvar odds em lote para ${changed.length} ${
          changed.length === 1 ? "luta" : "lutas"
        } deste evento?`,
      )
    ) {
      return;
    }

    setSync({ loading: true, msg: "" });
    for (const fight of changed) {
      const current = bulkOdds[fight.id];
      const { error } = await sb
        .from("fights")
        .update({
          odds_a: current.odds_a || null,
          odds_b: current.odds_b || null,
        })
        .eq("id", fight.id);

      if (error) {
        setSync({ loading: false, msg: error.message });
        toast.error(error.message);
        return;
      }
    }

    setSync({ loading: false, msg: `${changed.length} luta(s) atualizadas em lote` });
    toast.success(`${changed.length} luta(s) atualizadas em lote`);
    loadFights(selectedEventId);
  }

  async function handlePreviewSync() {
    setSync({ loading: true, msg: "" });
    setPreview(null);
    try {
      const res = await fetch("/api/sync-odds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: true, event_id: selectedEventId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSync({ loading: false, msg: `Erro: ${data.error}` });
        toast.error(data.error);
        return;
      }
      setPreview({
        matches: data.matches || [],
        skipped: data.skipped || [],
        message: data.message,
      });
      setSync({
        loading: false,
        msg: `${data.message} (${data.requests_remaining} req restantes)`,
      });
    } catch (e: any) {
      setSync({ loading: false, msg: e.message });
      toast.error(e.message);
    }
  }

  async function handleAutoSync() {
    setSync({ loading: true, msg: "" });
    try {
      const res = await fetch("/api/sync-odds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: selectedEventId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSync({ loading: false, msg: `Erro: ${data.error}` });
        toast.error(data.error);
      } else {
        setSync({
          loading: false,
          msg: `${data.message} (${data.requests_remaining} req restantes)`,
        });
        toast.success(data.message);
        loadFights(selectedEventId);
        setPreview({
          matches: data.matches || [],
          skipped: data.skipped || [],
          message: data.message,
        });
      }
    } catch (e: any) {
      setSync({ loading: false, msg: e.message });
      toast.error(e.message);
    }
  }

  function applyPreviewToBulkEditor() {
    if (!preview?.matches?.length) {
      toast.error("Nenhuma prévia para aplicar.");
      return;
    }

    setBulkOdds((current) => {
      const next = { ...current };
      preview.matches.forEach((match: any) => {
        if (!match.changed) return;
        next[match.fight_id] = {
          odds_a: match.next_odds_a || "",
          odds_b: match.next_odds_b || "",
        };
      });
      return next;
    });
    toast.success("Prévia aplicada ao editor em massa.");
  }

  const fight = eventFights.find((f: any) => f.id === fightId);
  const changedCount = eventFights.filter((fight: any) => {
    const current = bulkOdds[fight.id];
    if (!current) return false;
    return (
      (fight.odds_a || "") !== current.odds_a || (fight.odds_b || "") !== current.odds_b
    );
  }).length;

  return (
    <div className="max-w-3xl space-y-4">
      <form onSubmit={handleSave} className="space-y-4">
      <div className="flex items-center justify-between">
        <div style={{ flex: 1 }}>
          <EventSelector
            sortedEvents={sortedEvents}
            value={selectedEventId}
            onChange={(id) => {
              setSelectedEventId(id);
              setFightId("");
              setPreview(null);
            }}
          />
        </div>
        <button
          type="button"
          onClick={handlePreviewSync}
          disabled={sync.loading}
          className="ml-4 mt-5 font-condensed font-700 text-xs uppercase tracking-widest px-3 py-2.5 flex items-center gap-1.5 disabled:opacity-40 transition-opacity hover:opacity-80"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text)",
            backgroundColor: "var(--bg-elevated)",
            whiteSpace: "nowrap",
          }}
        >
          {sync.loading ? "BUSCANDO..." : "PRÉVIA"}
        </button>
        <button
          type="button"
          onClick={handleAutoSync}
          disabled={sync.loading}
          className="ml-4 mt-5 font-condensed font-700 text-xs uppercase tracking-widest px-3 py-2.5 flex items-center gap-1.5 disabled:opacity-40 transition-opacity hover:opacity-80"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text)",
            backgroundColor: "var(--bg-elevated)",
            whiteSpace: "nowrap",
          }}
        >
          {sync.loading ? "BUSCANDO..." : "AUTO-SYNC"}
        </button>
      </div>
      {sync.msg && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {sync.msg}
        </p>
      )}
      {eventFights.length === 0 && (
        <div
          className="p-4"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <AdminEmptyState text="Esse evento ainda não tem lutas cadastradas. Adicione ou importe o card antes de editar odds." />
        </div>
      )}
      {preview && (
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
            {preview.message}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyPreviewToBulkEditor}
              className="px-3 py-2 font-condensed font-900 text-xs uppercase tracking-widest"
              style={{
                backgroundColor: "var(--red)",
                color: "white",
              }}
            >
              Aplicar no Editor em Massa
            </button>
          </div>
          {preview.matches.length > 0 && (
            <div className="space-y-2">
              {preview.matches.slice(0, 8).map((match) => (
                <p
                  key={match.fight_id}
                  className="text-xs"
                  style={{ color: match.changed ? "var(--text-secondary)" : "var(--text-muted)" }}
                >
                  {match.changed ? "↻" : "="} {match.fight_label} · {match.current_odds_a || "—"}/{match.current_odds_b || "—"} → {match.next_odds_a || "—"}/{match.next_odds_b || "—"} · {match.bookmaker}
                </p>
              ))}
            </div>
          )}
          {preview.skipped.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sem match: {preview.skipped.slice(0, 5).map((item) => item.fight_label).join(" · ")}
            </p>
          )}
        </div>
      )}
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
            <option key={f.id} value={f.id}>
              {f.fighter_a?.name} vs {f.fighter_b?.name}
            </option>
          ))}
        </select>
      </div>
      {fight && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              Odds — {fight.fighter_a?.name}
            </label>
            <input
              value={form.odds_a}
              onChange={(e) =>
                setForm((f) => ({ ...f, odds_a: e.target.value }))
              }
              placeholder="-150"
              style={inp}
              onFocus={focus}
              onBlur={blur}
            />
          </div>
          <div>
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              Odds — {fight.fighter_b?.name}
            </label>
            <input
              value={form.odds_b}
              onChange={(e) =>
                setForm((f) => ({ ...f, odds_b: e.target.value }))
              }
              placeholder="+120"
              style={inp}
              onFocus={focus}
              onBlur={blur}
            />
          </div>
        </div>
      )}
      <button
        type="submit"
        disabled={!fightId}
        className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
        style={{ backgroundColor: "var(--red)" }}
      >
        SALVAR ODDS
      </button>
      </form>

      <div
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
            Editor em Massa de Odds
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Ajuste todas as odds do evento e salve tudo de uma vez.
              {changedCount > 0
                ? ` ${changedCount} ${changedCount === 1 ? "luta pronta" : "lutas prontas"} para salvar.`
                : " Nenhuma alteração pendente."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveAllOdds}
            disabled={sync.loading || !eventFights.length || changedCount === 0}
            className="px-4 py-2 font-condensed font-900 text-xs uppercase tracking-widest text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--red)" }}
          >
            {sync.loading ? "SALVANDO..." : "SALVAR TUDO"}
          </button>
        </div>

        {eventFights.length === 0 ? (
          <AdminEmptyState text="Sem lutas para editar em massa neste evento." />
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {eventFights.map((fight: any) => (
              <div
                key={fight.id}
                className="grid grid-cols-[minmax(0,1fr)_120px_120px] gap-3 items-center p-3"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {fight.fighter_a?.name} vs {fight.fighter_b?.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {fight.weight_class} · {fight.card_type}
                  </p>
                </div>
                <input
                  value={bulkOdds[fight.id]?.odds_a || ""}
                  onChange={(e) =>
                    setBulkOdds((current) => ({
                      ...current,
                      [fight.id]: {
                        odds_a: e.target.value,
                        odds_b: current[fight.id]?.odds_b || "",
                      },
                    }))
                  }
                  placeholder={`Odds ${fight.fighter_a?.name || "A"}`}
                  style={inp}
                  onFocus={focus}
                  onBlur={blur}
                />
                <input
                  value={bulkOdds[fight.id]?.odds_b || ""}
                  onChange={(e) =>
                    setBulkOdds((current) => ({
                      ...current,
                      [fight.id]: {
                        odds_a: current[fight.id]?.odds_a || "",
                        odds_b: e.target.value,
                      },
                    }))
                  }
                  placeholder={`Odds ${fight.fighter_b?.name || "B"}`}
                  style={inp}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LUTAS: Links UFC ────────────────────────────────────────
function LutasLinks({
  sortedEvents,
  selectedEventId,
  setSelectedEventId,
  eventFights,
  loadFights,
}: any) {
  const [fightId, setFightId] = useState("");
  const [url, setUrl] = useState("");
  const [bulkLinks, setBulkLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    const nextState = Object.fromEntries(
      eventFights.map((fight: any) => [fight.id, fight.ufc_matchup_url || ""]),
    );
    setBulkLinks(nextState);
  }, [eventFights]);

  useEffect(() => {
    if (!fightId) {
      setUrl("");
      return;
    }

    const selectedFight = eventFights.find((fight: any) => fight.id === fightId);
    setUrl(selectedFight?.ufc_matchup_url || "");
  }, [fightId, eventFights]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fightId) {
      toast.error("Selecione uma luta.");
      return;
    }
    const sb = createClient();
    const { error } = await sb
      .from("fights")
      .update({ ufc_matchup_url: url || null })
      .eq("id", fightId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Link salvo!");
    setFightId("");
    setUrl("");
    loadFights(selectedEventId);
  }

  async function handleSaveAllLinks() {
    const sb = createClient();
    const changed = eventFights.filter(
      (fight: any) => (fight.ufc_matchup_url || "") !== (bulkLinks[fight.id] || ""),
    );

    if (!changed.length) {
      toast.error("Nenhuma mudança de link para salvar.");
      return;
    }

    if (
      !confirm(
        `Salvar links em lote para ${changed.length} ${
          changed.length === 1 ? "luta" : "lutas"
        } deste evento?`,
      )
    ) {
      return;
    }

    for (const fight of changed) {
      const { error } = await sb
        .from("fights")
        .update({ ufc_matchup_url: bulkLinks[fight.id] || null })
        .eq("id", fight.id);

      if (error) {
        toast.error(error.message);
        return;
      }
    }

    toast.success(`${changed.length} link(s) atualizados em lote`);
    loadFights(selectedEventId);
  }

  const changedCount = eventFights.filter(
    (fight: any) => (fight.ufc_matchup_url || "") !== (bulkLinks[fight.id] || ""),
  ).length;

  return (
    <div className="max-w-3xl space-y-4">
      <form onSubmit={handleSave} className="max-w-lg space-y-4">
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
            <option key={f.id} value={f.id}>
              {f.fighter_a?.name} vs {f.fighter_b?.name}
            </option>
          ))}
        </select>
      </div>
      {fightId && (
        <div>
          <label className={lbl} style={{ color: "var(--text-secondary)" }}>
            Link da Luta no UFC.com
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.ufc.com.br/event/ufc-fight-night-march-28-2026#12604"
            style={inp}
            onFocus={focus}
            onBlur={blur}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Cole a URL completa com o # da luta
          </p>
        </div>
      )}
      <button
        type="submit"
        disabled={!fightId}
        className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
        style={{ backgroundColor: "var(--red)" }}
      >
        SALVAR LINK
      </button>
      </form>

      {eventFights.length === 0 && (
        <div
          className="p-4"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <AdminEmptyState text="Esse evento ainda não tem lutas cadastradas. Adicione ou importe o card antes de editar links oficiais." />
        </div>
      )}

      <div
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
            Editor em Massa de Links UFC
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Preencha ou ajuste os links oficiais de todas as lutas do evento.
              {changedCount > 0
                ? ` ${changedCount} ${changedCount === 1 ? "link pronto" : "links prontos"} para salvar.`
                : " Nenhuma alteração pendente."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveAllLinks}
            disabled={!eventFights.length || changedCount === 0}
            className="px-4 py-2 font-condensed font-900 text-xs uppercase tracking-widest text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--red)" }}
          >
            SALVAR TUDO
          </button>
        </div>

        {eventFights.length === 0 ? (
          <AdminEmptyState text="Sem lutas para editar links em massa neste evento." />
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {eventFights.map((fight: any) => (
              <div
                key={fight.id}
                className="p-3 space-y-2"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {fight.fighter_a?.name} vs {fight.fighter_b?.name}
                </p>
                <input
                  value={bulkLinks[fight.id] || ""}
                  onChange={(e) =>
                    setBulkLinks((current) => ({
                      ...current,
                      [fight.id]: e.target.value,
                    }))
                  }
                  placeholder="https://www.ufc.com.br/event/...#luta"
                  style={inp}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RESULTADOS: Auto-Sync ───────────────────────────────────
function ResAutoSync({
  sortedEvents,
  selectedEventId,
  setSelectedEventId,
  loadFights,
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
        A URL do UFCStats é configurada na aba <strong>Eventos → Editar</strong>
        . O sync busca resultados automaticamente.
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

function OperacoesFighters() {
  const [loading, setLoading] = useState(true);
  const [fighters, setFighters] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [primaryId, setPrimaryId] = useState("");
  const [duplicateId, setDuplicateId] = useState("");
  const [primaryQuery, setPrimaryQuery] = useState("");
  const [duplicateQuery, setDuplicateQuery] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const deferredPrimaryQuery = useDeferredValue(primaryQuery);
  const deferredDuplicateQuery = useDeferredValue(duplicateQuery);

  useEffect(() => {
    loadFighters();
  }, []);

  async function loadFighters() {
    setLoading(true);
    setError("");
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from("fighters")
        .select("id, name, country, ufc_fighter_id")
        .order("name");

      if (error) {
        setError(error.message);
        setFighters([]);
      } else {
        setFighters(data || []);
      }
    } catch (err) {
      setError(String(err));
      setFighters([]);
    } finally {
      setLoading(false);
    }
  }

  function normalizeFighterName(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function getSuggestionPrimary(a: any, b: any) {
    if (!!a.ufc_fighter_id !== !!b.ufc_fighter_id) {
      return a.ufc_fighter_id ? { primary: a, duplicate: b } : { primary: b, duplicate: a };
    }
    if ((a.name?.length || 0) !== (b.name?.length || 0)) {
      return (a.name?.length || 0) >= (b.name?.length || 0)
        ? { primary: a, duplicate: b }
        : { primary: b, duplicate: a };
    }
    return { primary: a, duplicate: b };
  }

  const duplicateSuggestions = useMemo(() => {
    const suggestions: {
      key: string;
      primary: any;
      duplicate: any;
      reason: string;
    }[] = [];
    const seen = new Set<string>();

    for (let index = 0; index < fighters.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < fighters.length; compareIndex += 1) {
        const left = fighters[index];
        const right = fighters[compareIndex];
        const leftNormalized = normalizeFighterName(left.name);
        const rightNormalized = normalizeFighterName(right.name);
        if (!leftNormalized || !rightNormalized) continue;

        const leftParts = leftNormalized.split(" ").filter(Boolean);
        const rightParts = rightNormalized.split(" ").filter(Boolean);
        const sameLastName =
          leftParts[leftParts.length - 1] &&
          leftParts[leftParts.length - 1] === rightParts[rightParts.length - 1];
        const sameFirstInitial = leftParts[0]?.[0] && leftParts[0]?.[0] === rightParts[0]?.[0];

        let reason: string | null = null;
        if (leftNormalized === rightNormalized) {
          reason = "Nome idêntico";
        } else if (
          sameLastName &&
          sameFirstInitial &&
          (leftNormalized.includes(rightNormalized) || rightNormalized.includes(leftNormalized))
        ) {
          reason = "Mesmo sobrenome e variação de nome";
        } else if (
          sameLastName &&
          sameFirstInitial &&
          left.country &&
          right.country &&
          left.country === right.country
        ) {
          reason = "Mesmo sobrenome, inicial e país";
        }

        if (!reason) continue;

        const orderedIds = [left.id, right.id].sort().join(":");
        if (seen.has(orderedIds)) continue;
        seen.add(orderedIds);

        const { primary, duplicate } = getSuggestionPrimary(left, right);
        suggestions.push({
          key: orderedIds,
          primary,
          duplicate,
          reason,
        });
      }
    }

    return suggestions.slice(0, 12);
  }, [fighters]);

  const primaryOptions = useMemo(
    () =>
      fighters
        .filter((fighter) =>
          normalizeFighterName(fighter.name).includes(
            normalizeFighterName(deferredPrimaryQuery),
          ),
        )
        .slice(0, 80),
    [fighters, deferredPrimaryQuery],
  );

  const duplicateOptions = useMemo(
    () =>
      fighters
        .filter((fighter) =>
          normalizeFighterName(fighter.name).includes(
            normalizeFighterName(deferredDuplicateQuery),
          ),
        )
        .slice(0, 80),
    [fighters, deferredDuplicateQuery],
  );

  async function runMerge(dryRun: boolean) {
    if (!primaryId || !duplicateId || primaryId === duplicateId) {
      toast.error("Selecione um principal e um duplicado diferentes.");
      return;
    }

    if (
      !dryRun &&
      !confirm(
        "Confirma mesclar este lutador duplicado? Essa ação move referências de lutas e picks e remove o ID duplicado.",
      )
    ) {
      return;
    }

    setSubmitting(true);
    if (dryRun) setPreview(null);

    try {
      const res = await fetch("/api/admin/merge-fighters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_id: primaryId,
          duplicate_id: duplicateId,
          dry_run: dryRun,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreview(data.summary || null);
        toast.error(data.error || "Erro ao mesclar lutadores");
        return;
      }

      if (dryRun) {
        setPreview(data.summary);
        toast.success(data.message);
      } else {
        toast.success(data.message);
        setPreview(data.summary);
        setDuplicateId("");
        setDuplicateQuery("");
        await loadFighters();
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="p-4 space-y-3"
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
            Mesclar Lutadores Duplicados
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Move referências de lutas e picks para um ID principal e remove o
            duplicado com segurança.
          </p>
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--red)" }}>
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              Manter este lutador
            </label>
            <input
              value={primaryQuery}
              onChange={(e) => setPrimaryQuery(e.target.value)}
              placeholder="Buscar lutador principal"
              style={inp}
              onFocus={focus}
              onBlur={blur}
            />
            <select
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
              style={sel}
              onFocus={focus}
              onBlur={blur}
            >
              <option value="">Selecione…</option>
              {primaryOptions.map((fighter) => (
                <option key={fighter.id} value={fighter.id}>
                  {fighter.name}
                  {fighter.country ? ` · ${fighter.country}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              Remover este duplicado
            </label>
            <input
              value={duplicateQuery}
              onChange={(e) => setDuplicateQuery(e.target.value)}
              placeholder="Buscar lutador duplicado"
              style={inp}
              onFocus={focus}
              onBlur={blur}
            />
            <select
              value={duplicateId}
              onChange={(e) => setDuplicateId(e.target.value)}
              style={sel}
              onFocus={focus}
              onBlur={blur}
            >
              <option value="">Selecione…</option>
              {duplicateOptions.map((fighter) => (
                <option key={fighter.id} value={fighter.id}>
                  {fighter.name}
                  {fighter.country ? ` · ${fighter.country}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => runMerge(true)}
            disabled={submitting || loading}
            className="flex-1 py-3 font-condensed font-900 text-sm uppercase tracking-widest disabled:opacity-40"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            {submitting ? "PROCESSANDO..." : "VER IMPACTO"}
          </button>
          <button
            onClick={() => runMerge(false)}
            disabled={submitting || loading}
            className="flex-1 py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--red)" }}
          >
            {submitting ? "MESCLANDO..." : "MESCLAR LUTADORES"}
          </button>
        </div>
      </div>

      {duplicateSuggestions.length > 0 && (
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
            Sugestões de Duplicados
          </p>
          <div className="space-y-2">
            {duplicateSuggestions.map((suggestion) => (
              <div
                key={suggestion.key}
                className="p-3"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {suggestion.reason}
                </p>
                <div className="flex items-center justify-between gap-3 mt-2">
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    <strong>Manter:</strong> {suggestion.primary.name}
                    <br />
                    <strong>Mesclar:</strong> {suggestion.duplicate.name}
                  </div>
                  <button
                    onClick={() => {
                      setPrimaryId(suggestion.primary.id);
                      setDuplicateId(suggestion.duplicate.id);
                      setPrimaryQuery(suggestion.primary.name);
                      setDuplicateQuery(suggestion.duplicate.name);
                    }}
                    className="px-3 py-2 text-xs font-condensed font-900 uppercase tracking-widest text-white"
                    style={{ backgroundColor: "var(--red)" }}
                  >
                    USAR ESTA SUGESTÃO
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {duplicateSuggestions.length === 0 && !loading && !error && (
        <div
          className="p-4"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <AdminEmptyState text="Nenhuma sugestão forte de duplicidade encontrada agora. Você ainda pode buscar e mesclar manualmente." />
        </div>
      )}

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
            Impacto do Merge
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {preview.primary?.name} ← {preview.duplicate?.name}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Lutas como A: {preview.impacts?.fights_as_a || 0} · Lutas como B:{" "}
            {preview.impacts?.fights_as_b || 0} · Winner refs:{" "}
            {preview.impacts?.winner_refs || 0} · Picks:{" "}
            {preview.impacts?.picked_winner_refs || 0}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Revise esse impacto antes de confirmar o merge definitivo.
          </p>
          {preview.conflicts?.length > 0 && (
            <div>
              <p className="text-xs" style={{ color: "var(--red)" }}>
                Conflitos detectados:
              </p>
              {preview.conflicts.map((conflict: any) => (
                <p
                  key={conflict.id}
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  • {conflict.label}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OperacoesFotos() {
  const [limit, setLimit] = useState(25);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    processed_count: number;
    updated: string[];
    not_found: string[];
    errors: string[];
    dry_run?: boolean;
  } | null>(null);

  async function runMediaSync(dryRun: boolean) {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/enrich-fighter-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dry_run: dryRun,
          only_missing: onlyMissing,
          limit,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao sincronizar fotos dos lutadores");
        return;
      }

      setResult(data);
      toast.success(data.message);
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
            Preencher Fotos dos Lutadores
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Busca automaticamente as fotos oficiais no UFC para reduzir o
            trabalho manual de cadastro e manutenção.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[160px_auto]">
          <div>
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              Limite por rodada
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value || "25", 10))}
              style={inp}
              onFocus={focus}
              onBlur={blur}
            />
          </div>
          <label
            className="flex items-center gap-2 pt-7"
            style={{ color: "var(--text-secondary)" }}
          >
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
            />
            <span className="text-xs uppercase tracking-widest">
              Só fighters sem foto
            </span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => runMediaSync(true)}
            disabled={loading}
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
            onClick={() => runMediaSync(false)}
            disabled={loading}
            className="py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--red)" }}
          >
            {loading ? "ATUALIZANDO..." : "PREENCHER FOTOS"}
          </button>
        </div>
      </div>

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
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Processados: {result.processed_count}
          </p>
          {result.updated.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Encontrados: {result.updated.join(" · ")}
            </p>
          )}
          {result.not_found.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sem foto: {result.not_found.join(" · ")}
            </p>
          )}
          {result.errors.length > 0 && (
            <p className="text-xs" style={{ color: "var(--red)" }}>
              Erros: {result.errors.join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function OperacoesAuditoria({ users }: { users: any[] }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [page, setPage] = useState(1);

  const userMap = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    setError("");
    try {
      const sb = createClient();
      const { data, error } = await sb
        .from("activity_logs")
        .select("id, user_id, action, details, suspicious, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        setError(error.message);
        setLogs([]);
      } else {
        setLogs(data || []);
        setPage(1);
      }
    } catch (err) {
      setError(String(err));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  function formatAction(action: string) {
    const labels: Record<string, string> = {
      admin_bulk_events: "Ações em lote",
      admin_enrich_fighter_media: "Fotos de lutadores",
      admin_merge_fighters: "Merge de lutadores",
      admin_sync_events: "Sync de eventos",
      admin_sync_odds: "Sync de odds",
      admin_sync_results: "Sync de resultados",
      admin_score_fight: "Pontuação manual",
      rapid_picks: "Atividade suspeita",
    };
    return labels[action] || action;
  }

  const actionOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const searchTerm = deferredSearch.trim().toLowerCase();
    return logs.filter((log) => {
      if (suspiciousOnly && !log.suspicious) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (!searchTerm) return true;

      const actor = log.user_id ? userMap.get(log.user_id) : null;
      const haystack = [
        formatAction(log.action),
        log.action,
        actor?.nickname,
        actor?.first_name,
        actor?.last_name,
        JSON.stringify(log.details || {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchTerm);
    });
  }, [logs, suspiciousOnly, actionFilter, deferredSearch, userMap]);

  const visibleLogs = filteredLogs.slice(0, page * 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            Auditoria
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Ações recentes do admin e alertas operacionais.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="px-3 py-2 font-condensed font-900 text-xs uppercase tracking-widest disabled:opacity-40"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          {loading ? "ATUALIZANDO..." : "ATUALIZAR"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por ação, usuário ou payload"
          style={inp}
          onFocus={focus}
          onBlur={blur}
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={sel}
          onFocus={focus}
          onBlur={blur}
        >
          <option value="all">Todas as ações</option>
          {actionOptions.map((action) => (
            <option key={action} value={action}>
              {formatAction(action)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-3" style={{ color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={suspiciousOnly}
            onChange={(e) => setSuspiciousOnly(e.target.checked)}
          />
          <span className="text-xs uppercase tracking-widest">Só suspeitos</span>
        </label>
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Exibindo {visibleLogs.length} de {filteredLogs.length} log(s) filtrados.
      </p>

      {error && (
        <p className="text-sm" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}

      <div style={{ border: "1px solid var(--border)" }}>
        {filteredLogs.length === 0 && !loading ? (
          <div className="p-4">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Nenhum log encontrado para esse filtro.
            </p>
          </div>
        ) : (
          visibleLogs.map((log, index) => {
            const actor = log.user_id ? userMap.get(log.user_id) : null;
            return (
              <div
                key={log.id}
                className="px-4 py-3 space-y-1"
                style={{
                  borderBottom:
                    index < visibleLogs.length - 1 ? "1px solid var(--border-light)" : "none",
                  backgroundColor: log.suspicious ? "rgba(232,0,26,0.04)" : "var(--bg-card)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p
                    className="font-condensed font-700 text-sm uppercase"
                    style={{ color: log.suspicious ? "var(--red)" : "var(--text)" }}
                  >
                    {formatAction(log.action)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatAdminDateTime(log.created_at)}
                  </p>
                </div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {actor
                    ? `${actor.nickname} (${actor.first_name} ${actor.last_name})`
                    : "Sistema / chamada externa"}
                </p>
                {log.details && (
                  <pre
                    className="text-xs whitespace-pre-wrap"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
                    }}
                  >
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>

      {visibleLogs.length < filteredLogs.length && (
        <button
          onClick={() => setPage((current) => current + 1)}
          className="px-4 py-2 font-condensed font-900 text-xs uppercase tracking-widest"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          Carregar Mais
        </button>
      )}
    </div>
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
    const sb = createClient();
    const { data: fd } = await sb
      .from("fights")
      .select("fighter_a_id, fighter_b_id")
      .eq("id", fightId)
      .single();
    const winnerId =
      form.winner_side === "a" ? fd?.fighter_a_id : fd?.fighter_b_id;
    const round = form.method === "decision" ? 3 : form.round;
    const { error } = await sb
      .from("fights")
      .update({
        winner_id: winnerId,
        result_method: form.method,
        result_round: round,
        result_confirmed: true,
      })
      .eq("id", fightId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await fetch("/api/results/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fight_id: fightId }),
    });
    toast.success("Resultado inserido e picks pontuados!");
    loadFights(selectedEventId);
    setFightId("");
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

// ─── USUÁRIOS ────────────────────────────────────────────────
function Usuarios({ userList, setUserList }: any) {
  async function toggleBan(userId: string, currentBan: boolean) {
    const sb = createClient();
    const { error } = await sb
      .from("profiles")
      .update({ is_banned: !currentBan })
      .eq("id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setUserList((u: any[]) =>
      u.map((p: any) =>
        p.id === userId ? { ...p, is_banned: !currentBan } : p,
      ),
    );
    toast.success(currentBan ? "Usuário desbanido." : "Usuário banido.");
  }

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "user" : "admin";
    const sb = createClient();
    const { error } = await sb
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setUserList((u: any[]) =>
      u.map((p: any) => (p.id === userId ? { ...p, role: newRole } : p)),
    );
    toast.success(`Role alterada para ${newRole}.`);
  }

  return (
    <div style={{ border: "1px solid var(--border)" }}>
      <div
        className="grid grid-cols-12 px-4 py-2"
        style={{
          backgroundColor: "var(--bg-elevated)",
          borderBottom: "2px solid var(--red)",
        }}
      >
        {["Nickname", "Nome", "Pts", "Role", "Ação"].map((h, i) => (
          <div
            key={h}
            className={
              i === 0
                ? "col-span-3"
                : i === 1
                  ? "col-span-4"
                  : i === 4
                    ? "col-span-2 text-right"
                    : "col-span-1"
            }
          >
            <span
              className="font-condensed font-700 text-xs uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              {h}
            </span>
          </div>
        ))}
      </div>
      {userList.map((u: any, i: number) => (
        <div
          key={u.id}
          className="grid grid-cols-12 items-center px-4 py-3"
          style={{
            borderBottom:
              i < userList.length - 1
                ? "1px solid var(--border-light)"
                : "none",
          }}
        >
          <div className="col-span-3">
            <span
              className="font-condensed font-900 text-sm uppercase"
              style={{
                color: u.is_banned ? "var(--text-muted)" : "var(--text)",
              }}
            >
              {u.nickname}
            </span>
          </div>
          <div className="col-span-4">
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {u.first_name} {u.last_name}
            </span>
          </div>
          <div className="col-span-1">
            <span
              className="font-condensed font-700 text-sm"
              style={{ color: "var(--red)" }}
            >
              {u.total_points}
            </span>
          </div>
          <div className="col-span-1">
            <span
              className="font-condensed font-600 text-xs uppercase"
              style={{
                color: u.role === "admin" ? "var(--red)" : "var(--text-muted)",
              }}
            >
              {u.role}
            </span>
          </div>
          <div className="col-span-2 flex gap-1 justify-end">
            <button
              onClick={() => toggleRole(u.id, u.role)}
              className="font-condensed font-700 text-xs uppercase px-2 py-1 transition-opacity hover:opacity-70"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontSize: "10px",
              }}
            >
              {u.role === "admin" ? "→USER" : "→ADMIN"}
            </button>
            <button
              onClick={() => toggleBan(u.id, u.is_banned)}
              className="font-condensed font-700 text-xs uppercase px-2 py-1 transition-opacity hover:opacity-70"
              style={{
                border: `1px solid ${u.is_banned ? "var(--border)" : "var(--red)"}`,
                color: u.is_banned ? "var(--text-muted)" : "var(--red)",
                fontSize: "10px",
              }}
            >
              {u.is_banned ? "DESBANIR" : "BANIR"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
