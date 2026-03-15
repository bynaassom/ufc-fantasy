"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import FighterSearchInput from "./FighterSearchInput";

// ─── Types ───────────────────────────────────────────────────
type MainTab = "eventos" | "lutas" | "resultados" | "usuarios";
type SubTab =
  | "evento-manual"
  | "evento-importar"
  | "evento-editar"
  | "lutas-nova"
  | "lutas-odds"
  | "lutas-links"
  | "res-auto"
  | "res-manual"
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
  { value: "early_preliminary", label: "Early Prelims" },
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
      {(subTab === "usuarios" || mainTab === "usuarios") && (
        <Usuarios userList={userList} setUserList={setUserList} />
      )}
    </div>
  );
}

// ─── Shared EventSelector ────────────────────────────────────
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
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [sql, setSql] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);

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

  return (
    <div className="max-w-2xl space-y-6">
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
    const earlyFights = newFights.filter(
      (f) => f.card_type === "early_preliminary",
    );

    const updates: Promise<any>[] = [];
    [...mainFights, ...prelimFights, ...earlyFights].forEach((f) => {
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
  const [sync, setSync] = useState<{ loading: boolean; msg: string }>({
    loading: false,
    msg: "",
  });

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
  }

  async function handleAutoSync() {
    setSync({ loading: true, msg: "" });
    try {
      const res = await fetch("/api/sync-odds", { method: "POST" });
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
      }
    } catch (e: any) {
      setSync({ loading: false, msg: e.message });
      toast.error(e.message);
    }
  }

  const fight = eventFights.find((f: any) => f.id === fightId);

  return (
    <form onSubmit={handleSave} className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div style={{ flex: 1 }}>
          <EventSelector
            sortedEvents={sortedEvents}
            value={selectedEventId}
            onChange={(id) => {
              setSelectedEventId(id);
              setFightId("");
            }}
          />
        </div>
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
  }

  return (
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
