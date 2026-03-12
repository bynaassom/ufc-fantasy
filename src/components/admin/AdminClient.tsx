"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import FighterSearchInput from "./FighterSearchInput";

type Tab = "event" | "fight" | "result" | "users" | "import" | "sync";

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

const inputStyle: React.CSSProperties = {
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

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
const labelClass =
  "block text-xs font-condensed font-700 uppercase tracking-widest mb-1.5";

export default function AdminClient({
  events,
  users,
}: {
  events: any[];
  users: any[];
}) {
  const [tab, setTab] = useState<Tab>("event");

  // Memoiza tabs e listas para evitar recriação a cada render
  const tabs = useMemo(
    () => [
      { key: "event" as Tab, label: "Novo Evento" },
      { key: "fight" as Tab, label: "Nova Luta" },
      { key: "result" as Tab, label: "Resultados" },
      { key: "sync" as Tab, label: "Auto-Sync" },
      { key: "users" as Tab, label: "Usuários" },
      { key: "import" as Tab, label: "Importar" },
    ],
    [],
  );

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          new Date(b.event_date).getTime() - new Date(a.event_date).getTime(),
      ),
    [events],
  );

  // ── Event form ──────────────────────────────────────────────
  const [eventForm, setEventForm] = useState({
    name: "",
    location: "",
    event_date: "",
    banner_image_url: "",
  });

  // ── Fight form ─────────────────────────────────────────────
  const [selectedEventId, setSelectedEventId] = useState(
    sortedEvents[0]?.id || "",
  );
  const [fightForm, setFightForm] = useState<FightForm>({
    fighter_a: { name: "", headshot_url: "", country: "" },
    fighter_b: { name: "", headshot_url: "", country: "" },
    weight_class: "Lightweight",
    is_title_fight: false,
    total_rounds: 3,
    card_type: "main",
    fight_order: 1,
  });

  // ── Result form ────────────────────────────────────────────
  const [resultFightId, setResultFightId] = useState("");
  const [resultForm, setResultForm] = useState({
    winner_side: "a" as "a" | "b",
    method: "decision" as "decision" | "submission" | "knockout",
    round: 1,
  });

  // ── Odds & Links form ──────────────────────────────────────
  const [oddsFightId, setOddsFightId] = useState("");
  const [oddsForm, setOddsForm] = useState({
    odds_a: "",
    odds_b: "",
    ufc_matchup_url: "",
  });

  // ── Odds sync ─────────────────────────────────────────────
  const [oddsSync, setOddsSync] = useState<{ loading: boolean; msg: string }>({
    loading: false,
    msg: "",
  });

  // ── Results sync ───────────────────────────────────────────
  const [syncForm, setSyncForm] = useState({
    ufc_stats_url: "",
    espn_event_id: "",
  });
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    message: string;
    results?: string[];
  } | null>(null);

  // ── Users ──────────────────────────────────────────────────
  const [userList, setUserList] = useState(users);

  // ── Import / Scraper ───────────────────────────────────────
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importData, setImportData] = useState<null | {
    event: any;
    fights: any[];
  }>(null);
  const [importSql, setImportSql] = useState("");
  const [importError, setImportError] = useState("");

  // ── Lutas do evento selecionado ────────────────────────────
  const [eventFights, setEventFights] = useState<any[]>([]);

  // Carrega lutas apenas quando o evento selecionado muda (não a cada troca de aba)
  useEffect(() => {
    if (selectedEventId) loadFights(selectedEventId);
  }, [selectedEventId]);

  async function loadFights(eventId: string) {
    const sb = createClient();
    const { data } = await sb
      .from("fights")
      .select(
        "id, fighter_a:fighters!fighter_a_id(name), fighter_b:fighters!fighter_b_id(name), result_confirmed",
      )
      .eq("event_id", eventId)
      .order("card_type")
      .order("fight_order");
    setEventFights(data || []);
  }

  // ────────────────────────────────────────────────────────────
  // SUBMIT: criar evento
  // ────────────────────────────────────────────────────────────
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    const sb = createClient();
    const slug = eventForm.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { error } = await sb.from("events").insert({
      ...eventForm,
      slug,
      status: "upcoming",
    });

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Evento criado!");
    setEventForm({
      name: "",
      location: "",
      event_date: "",
      banner_image_url: "",
    });
  }

  // ────────────────────────────────────────────────────────────
  // SUBMIT: criar luta (com upsert dos lutadores)
  // ────────────────────────────────────────────────────────────
  async function handleCreateFight(e: React.FormEvent) {
    e.preventDefault();
    if (!fightForm.fighter_a.name || !fightForm.fighter_b.name) {
      toast.error("Preencha os nomes dos dois lutadores.");
      return;
    }
    if (!selectedEventId) {
      toast.error("Selecione um evento.");
      return;
    }

    const sb = createClient();

    // Upsert fighter A e B
    const fighterIds: { a: string; b: string } = { a: "", b: "" };
    for (const side of ["a", "b"] as const) {
      const fighter = fightForm[`fighter_${side}`];
      const { data: existing } = await sb
        .from("fighters")
        .select("id")
        .eq("name", fighter.name)
        .limit(1)
        .single();

      if (existing) {
        // Atualiza headshot se veio vazio antes
        if (fighter.headshot_url) {
          await sb
            .from("fighters")
            .update({
              headshot_url: fighter.headshot_url,
              country: fighter.country,
            })
            .eq("id", existing.id);
        }
        fighterIds[side] = existing.id;
      } else {
        const { data, error } = await sb
          .from("fighters")
          .insert({
            name: fighter.name,
            headshot_url: fighter.headshot_url,
            country: fighter.country,
          })
          .select("id")
          .single();
        if (error) {
          toast.error(`Erro ao inserir ${fighter.name}: ${error.message}`);
          return;
        }
        fighterIds[side] = data.id;
      }
    }

    // Inserir luta
    const { error } = await sb.from("fights").insert({
      event_id: selectedEventId,
      fighter_a_id: fighterIds.a,
      fighter_b_id: fighterIds.b,
      weight_class: fightForm.weight_class,
      is_title_fight: fightForm.is_title_fight,
      total_rounds: fightForm.total_rounds,
      card_type: fightForm.card_type,
      fight_order: fightForm.fight_order,
    });

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      `Luta adicionada: ${fightForm.fighter_a.name} vs ${fightForm.fighter_b.name}`,
    );

    // Reset apenas os lutadores
    setFightForm((f) => ({
      ...f,
      fighter_a: { name: "", headshot_url: "", country: "" },
      fighter_b: { name: "", headshot_url: "", country: "" },
      fight_order: f.fight_order + 1,
    }));
    loadFights(selectedEventId);
  }

  // ────────────────────────────────────────────────────────────
  // SUBMIT: inserir resultado
  // ────────────────────────────────────────────────────────────
  async function handleInsertResult(e: React.FormEvent) {
    e.preventDefault();
    const fight = eventFights.find((f) => f.id === resultFightId);
    if (!fight) {
      toast.error("Selecione uma luta.");
      return;
    }
    // Para decisão, round é sempre o último
    if (resultForm.method === "decision") {
      setResultForm((r) => ({ ...r, round: 3 }));
    }

    const sb = createClient();
    const winner_id =
      resultForm.winner_side === "a"
        ? fight.fighter_a?.id
        : fight.fighter_b?.id;

    // Busca os IDs dos lutadores
    const { data: fightData } = await sb
      .from("fights")
      .select("fighter_a_id, fighter_b_id")
      .eq("id", resultFightId)
      .single();

    const winnerId =
      resultForm.winner_side === "a"
        ? fightData?.fighter_a_id
        : fightData?.fighter_b_id;

    const { error } = await sb
      .from("fights")
      .update({
        winner_id: winnerId,
        result_method: resultForm.method,
        result_round: resultForm.round,
        result_confirmed: true,
      })
      .eq("id", resultFightId);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Pontua os picks
    await fetch("/api/results/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fight_id: resultFightId }),
    });

    toast.success("Resultado inserido e picks pontuados!");
    loadFights(selectedEventId);
    setResultFightId("");
  }

  // ────────────────────────────────────────────────────────────
  // SUBMIT: salvar odds e slugs UFC
  // ────────────────────────────────────────────────────────────
  async function handleSaveOdds(e: React.FormEvent) {
    e.preventDefault();
    if (!oddsFightId) {
      toast.error("Selecione uma luta.");
      return;
    }
    const sb = createClient();
    const { error } = await sb
      .from("fights")
      .update({
        odds_a: oddsForm.odds_a || null,
        odds_b: oddsForm.odds_b || null,
        ufc_matchup_url: oddsForm.ufc_matchup_url || null,
      })
      .eq("id", oddsFightId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Odds e links salvos!");
    setOddsFightId("");
    setOddsForm({ odds_a: "", odds_b: "", ufc_matchup_url: "" });
  }

  // ────────────────────────────────────────────────────────────
  // SYNC: importa resultados do UFCStats + ESPN
  // ────────────────────────────────────────────────────────────
  async function handleSyncResults(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId || !syncForm.ufc_stats_url) {
      toast.error("Selecione o evento e cole a URL do UFCStats");
      return;
    }
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: selectedEventId,
          ufc_stats_url: syncForm.ufc_stats_url,
          espn_event_id: syncForm.espn_event_id || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        setSyncLoading(false);
        return;
      }
      setSyncResult(data);
      toast.success(data.message);
      loadFights(selectedEventId);
    } catch (err: any) {
      toast.error(err.message);
    }
    setSyncLoading(false);
  }

  // ────────────────────────────────────────────────────────────
  // SYNC: busca odds na The Odds API
  // ────────────────────────────────────────────────────────────
  async function handleSyncOdds() {
    setOddsSync({ loading: true, msg: "" });
    try {
      const res = await fetch("/api/sync-odds", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setOddsSync({ loading: false, msg: `Erro: ${data.error}` });
        toast.error(data.error);
      } else {
        setOddsSync({
          loading: false,
          msg: `${data.message} (${data.requests_remaining} req restantes)`,
        });
        toast.success(data.message);
        loadFights(selectedEventId);
      }
    } catch (e: any) {
      setOddsSync({ loading: false, msg: e.message });
      toast.error(e.message);
    }
  }

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
    setUserList((u) =>
      u.map((p) => (p.id === userId ? { ...p, is_banned: !currentBan } : p)),
    );
    toast.success(currentBan ? "Usuário desbanido." : "Usuário banido.");
  }

  // ── Scrape ────────────────────────────────────────────────
  async function handleScrape() {
    if (!importUrl.trim()) {
      toast.error("Cole uma URL válida.");
      return;
    }
    setImportLoading(true);
    setImportData(null);
    setImportSql("");
    setImportError("");
    try {
      const res = await fetch("/api/scrape-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        setImportError(json.error || "Erro desconhecido");
        return;
      }
      setImportData(json);
      setImportSql(generateSql(json));
    } catch (err) {
      setImportError(String(err));
    } finally {
      setImportLoading(false);
    }
  }

  function generateSql(data: { event: any; fights: any[] }): string {
    const { event, fights } = data;
    const slug = (event.name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const lines: string[] = [
      "-- ============================================================",
      `-- ${event.name}`,
      "-- ============================================================",
      "",
      "-- 1. Evento",
      `INSERT INTO events (id, name, slug, event_date, location, banner_image_url, status, picks_open_at)`,
      `VALUES (`,
      `  gen_random_uuid(),`,
      `  '${(event.name || "").replace(/'/g, "''")}',`,
      `  '${slug}',`,
      `  '${event.event_date || ""}',`,
      `  '${(event.location || "").replace(/'/g, "''")}',`,
      `  '${event.banner_image_url || ""}',`,
      `  'upcoming',`,
      `  NOW() -- ajuste: picks_open_at (ex: data_evento_anterior + 12h)`,
      `);`,
      "",
      "-- 2. Lutadores e Lutas",
    ];

    fights.forEach((fight, i) => {
      const fa = fight.fighter_a;
      const fb = fight.fighter_b;
      lines.push(`-- Luta ${i + 1}: ${fa.name} vs ${fb.name}`);
      lines.push(
        `INSERT INTO fighters (id, name, headshot_url, country) VALUES (gen_random_uuid(), '${fa.name.replace(/'/g, "''")}', '${fa.headshot_url || ""}', '${(fa.country || "").replace(/'/g, "''")}') ON CONFLICT (name) DO UPDATE SET headshot_url = EXCLUDED.headshot_url, country = EXCLUDED.country;`,
      );
      lines.push(
        `INSERT INTO fighters (id, name, headshot_url, country) VALUES (gen_random_uuid(), '${fb.name.replace(/'/g, "''")}', '${fb.headshot_url || ""}', '${(fb.country || "").replace(/'/g, "''")}') ON CONFLICT (name) DO UPDATE SET headshot_url = EXCLUDED.headshot_url, country = EXCLUDED.country;`,
      );
      lines.push(
        `INSERT INTO fights (event_id, fighter_a_id, fighter_b_id, card_type, fight_order, weight_class, is_title_fight, total_rounds)`,
      );
      lines.push(`VALUES (`);
      lines.push(`  (SELECT id FROM events WHERE slug = '${slug}'),`);
      lines.push(
        `  (SELECT id FROM fighters WHERE name = '${fa.name.replace(/'/g, "''")}'),`,
      );
      lines.push(
        `  (SELECT id FROM fighters WHERE name = '${fb.name.replace(/'/g, "''")}'),`,
      );
      lines.push(
        `  '${fight.card_type}', ${fight.fight_order}, '${fight.weight_class}', ${fight.is_title_fight}, ${fight.total_rounds}`,
      );
      lines.push(`);`);
      lines.push("");
    });

    return lines.join("\n");
  }

  return (
    <div>
      {/* Tabs */}
      <div
        className="flex gap-0 mb-8"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="relative font-condensed font-700 text-xs uppercase tracking-widest px-6 py-3 transition-all"
            style={{
              color: tab === t.key ? "var(--red)" : "var(--text-muted)",
            }}
          >
            {t.label}
            {tab === t.key && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: "var(--red)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: NOVO EVENTO ─────────────────────────────────── */}
      {tab === "event" && (
        <form onSubmit={handleCreateEvent} className="max-w-lg space-y-4">
          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              Nome do Evento
            </label>
            <input
              required
              value={eventForm.name}
              onChange={(e) =>
                setEventForm({ ...eventForm, name: e.target.value })
              }
              placeholder="Ex: UFC 327"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              Local
            </label>
            <input
              value={eventForm.location}
              onChange={(e) =>
                setEventForm({ ...eventForm, location: e.target.value })
              }
              placeholder="Ex: T-Mobile Arena, Las Vegas, NV"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              Data e Hora (local)
            </label>
            <input
              required
              type="datetime-local"
              value={eventForm.event_date}
              onChange={(e) =>
                setEventForm({ ...eventForm, event_date: e.target.value })
              }
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              URL do Banner (opcional)
            </label>
            <input
              value={eventForm.banner_image_url}
              onChange={(e) =>
                setEventForm({ ...eventForm, banner_image_url: e.target.value })
              }
              placeholder="https://..."
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--red)" }}
          >
            CRIAR EVENTO
          </button>
        </form>
      )}

      {/* ── TAB: NOVA LUTA ────────────────────────────────────── */}
      {tab === "fight" && (
        <form onSubmit={handleCreateFight} className="max-w-2xl space-y-5">
          {/* Evento */}
          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              Evento
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                loadFights(e.target.value);
              }}
              style={selectStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            >
              {sortedEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lutadores — lado a lado com busca automática */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FighterSearchInput
              label="Lutador A (vermelho)"
              value={fightForm.fighter_a}
              onChange={(d) => setFightForm((f) => ({ ...f, fighter_a: d }))}
            />
            <FighterSearchInput
              label="Lutador B (azul)"
              value={fightForm.fighter_b}
              onChange={(d) => setFightForm((f) => ({ ...f, fighter_b: d }))}
            />
          </div>

          {/* Detalhes da luta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className={labelClass}
                style={{ color: "var(--text-secondary)" }}
              >
                Categoria de Peso
              </label>
              <select
                value={fightForm.weight_class}
                onChange={(e) =>
                  setFightForm((f) => ({ ...f, weight_class: e.target.value }))
                }
                style={selectStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
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
                className={labelClass}
                style={{ color: "var(--text-secondary)" }}
              >
                Tipo de Card
              </label>
              <select
                value={fightForm.card_type}
                onChange={(e) =>
                  setFightForm((f) => ({ ...f, card_type: e.target.value }))
                }
                style={selectStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              >
                {CARD_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className={labelClass}
                style={{ color: "var(--text-secondary)" }}
              >
                Rounds
              </label>
              <select
                value={fightForm.total_rounds}
                onChange={(e) =>
                  setFightForm((f) => ({ ...f, total_rounds: +e.target.value }))
                }
                style={selectStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              >
                <option value={3}>3 rounds</option>
                <option value={5}>5 rounds (main/título)</option>
              </select>
            </div>
            <div>
              <label
                className={labelClass}
                style={{ color: "var(--text-secondary)" }}
              >
                Ordem no Card
              </label>
              <input
                type="number"
                min={1}
                value={fightForm.fight_order}
                onChange={(e) =>
                  setFightForm((f) => ({ ...f, fight_order: +e.target.value }))
                }
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          </div>

          {/* Título */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={fightForm.is_title_fight}
              onChange={(e) =>
                setFightForm((f) => ({
                  ...f,
                  is_title_fight: e.target.checked,
                  total_rounds: e.target.checked ? 5 : 3,
                }))
              }
              style={{ accentColor: "var(--red)", width: 16, height: 16 }}
            />
            <span
              className="font-condensed font-700 text-sm uppercase tracking-widest"
              style={{ color: "var(--text)" }}
            >
              Disputa de Cinturão / BMF Title
            </span>
          </label>

          <button
            type="submit"
            className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--red)" }}
          >
            ADICIONAR LUTA
          </button>

          {/* Lutas já cadastradas */}
          {eventFights.length > 0 && (
            <div className="mt-4">
              <p
                className="font-condensed font-700 text-xs uppercase tracking-widest mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Lutas cadastradas neste evento
              </p>
              <div style={{ border: "1px solid var(--border)" }}>
                {eventFights.map((f, i) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{
                      borderBottom:
                        i < eventFights.length - 1
                          ? "1px solid var(--border-light)"
                          : "none",
                    }}
                  >
                    <span
                      className="font-condensed font-700 text-sm"
                      style={{ color: "var(--text)" }}
                    >
                      {f.fighter_a?.name} vs {f.fighter_b?.name}
                    </span>
                    {f.result_confirmed && (
                      <span
                        className="font-condensed font-700 text-xs px-2 py-0.5"
                        style={{
                          backgroundColor: "var(--red)",
                          color: "white",
                        }}
                      >
                        RESULT
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      )}

      {/* ── TAB: RESULTADO ────────────────────────────────────── */}
      {tab === "result" && (
        <form onSubmit={handleInsertResult} className="max-w-lg space-y-4">
          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              Evento
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                loadFights(e.target.value);
                setResultFightId("");
              }}
              style={selectStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            >
              {sortedEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              Luta
            </label>
            <select
              value={resultFightId}
              onChange={(e) => setResultFightId(e.target.value)}
              style={selectStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            >
              <option value="">Selecione uma luta…</option>
              {eventFights.map((f) => (
                <option key={f.id} value={f.id} disabled={f.result_confirmed}>
                  {f.fighter_a?.name} vs {f.fighter_b?.name}
                  {f.result_confirmed && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{
                        color: "var(--red)",
                        display: "inline",
                        marginLeft: "4px",
                      }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </option>
              ))}
            </select>
          </div>

          {resultFightId &&
            (() => {
              const fight = eventFights.find((f) => f.id === resultFightId);
              if (!fight) return null;
              return (
                <>
                  <div>
                    <label
                      className={labelClass}
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Vencedor
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["a", "b"] as const).map((side) => (
                        <button
                          type="button"
                          key={side}
                          onClick={() =>
                            setResultForm((r) => ({ ...r, winner_side: side }))
                          }
                          className="py-3 font-condensed font-900 text-sm uppercase tracking-wide transition-all"
                          style={{
                            backgroundColor:
                              resultForm.winner_side === side
                                ? "var(--red)"
                                : "var(--bg-elevated)",
                            color:
                              resultForm.winner_side === side
                                ? "white"
                                : "var(--text)",
                            border: `1px solid ${resultForm.winner_side === side ? "var(--red)" : "var(--border)"}`,
                          }}
                        >
                          {fight[`fighter_${side}`]?.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      className={labelClass}
                      style={{ color: "var(--text-secondary)" }}
                    >
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
                          onClick={() =>
                            setResultForm((r) => ({ ...r, method: v }))
                          }
                          className="py-3 font-condensed font-900 text-xs uppercase tracking-widest transition-all"
                          style={{
                            backgroundColor:
                              resultForm.method === v
                                ? "var(--red)"
                                : "var(--bg-elevated)",
                            color:
                              resultForm.method === v ? "white" : "var(--text)",
                            border: `1px solid ${resultForm.method === v ? "var(--red)" : "var(--border)"}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Round — só para KO e finalização */}
                  {resultForm.method !== "decision" && (
                    <div>
                      <label
                        className={labelClass}
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Round
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button
                            type="button"
                            key={r}
                            onClick={() =>
                              setResultForm((rf) => ({ ...rf, round: r }))
                            }
                            className="w-12 h-12 font-condensed font-900 text-sm transition-all"
                            style={{
                              backgroundColor:
                                resultForm.round === r
                                  ? "var(--red)"
                                  : "var(--bg-elevated)",
                              color:
                                resultForm.round === r
                                  ? "white"
                                  : "var(--text)",
                              border: `1px solid ${resultForm.round === r ? "var(--red)" : "var(--border)"}`,
                            }}
                          >
                            R{r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

          <button
            type="submit"
            disabled={!resultFightId}
            className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--red)" }}
          >
            CONFIRMAR RESULTADO
          </button>
        </form>
      )}

      {/* ── TAB: ODDS & LINKS ─────────────────────────────────── */}
      {tab === "result" && (
        <form
          onSubmit={handleSaveOdds}
          className="max-w-lg space-y-4 mt-10 pt-8"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="red-line flex items-center justify-between">
            <span className="section-title" style={{ fontSize: "1rem" }}>
              ODDS & LINKS UFC
            </span>
            <button
              type="button"
              onClick={handleSyncOdds}
              disabled={oddsSync.loading}
              className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-1.5 transition-all hover:opacity-80 disabled:opacity-40 flex items-center gap-1.5"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {oddsSync.loading ? (
                <>
                  <svg
                    className="animate-spin"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  BUSCANDO…
                </>
              ) : (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M23 4v6h-6" />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  AUTO-SYNC ODDS
                </>
              )}
            </button>
          </div>
          {oddsSync.msg && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {oddsSync.msg}
            </p>
          )}

          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              Evento
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                loadFights(e.target.value);
                setOddsFightId("");
              }}
              style={selectStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            >
              {sortedEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              Luta
            </label>
            <select
              value={oddsFightId}
              onChange={(e) => setOddsFightId(e.target.value)}
              style={selectStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            >
              <option value="">Selecione uma luta…</option>
              {eventFights.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fighter_a?.name} vs {f.fighter_b?.name}
                </option>
              ))}
            </select>
          </div>

          {oddsFightId &&
            (() => {
              const fight = eventFights.find((f) => f.id === oddsFightId);
              if (!fight) return null;
              return (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        className={labelClass}
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Odds — {fight.fighter_a?.name}
                      </label>
                      <input
                        value={oddsForm.odds_a}
                        onChange={(e) =>
                          setOddsForm((o) => ({ ...o, odds_a: e.target.value }))
                        }
                        placeholder="-150"
                        style={inputStyle}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "var(--red)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = "var(--border)")
                        }
                      />
                    </div>
                    <div>
                      <label
                        className={labelClass}
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Odds — {fight.fighter_b?.name}
                      </label>
                      <input
                        value={oddsForm.odds_b}
                        onChange={(e) =>
                          setOddsForm((o) => ({ ...o, odds_b: e.target.value }))
                        }
                        placeholder="+120"
                        style={inputStyle}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "var(--red)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = "var(--border)")
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      className={labelClass}
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Link da Luta no UFC.com
                    </label>
                    <input
                      value={oddsForm.ufc_matchup_url}
                      onChange={(e) =>
                        setOddsForm((o) => ({
                          ...o,
                          ufc_matchup_url: e.target.value,
                        }))
                      }
                      placeholder="https://www.ufc.com.br/event/ufc-fight-night-march-14-2026#12617"
                      style={inputStyle}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--red)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--border)")
                      }
                    />
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Cole a URL completa com o # da luta
                    </p>
                  </div>
                </>
              );
            })()}

          <button
            type="submit"
            disabled={!oddsFightId}
            className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--red)" }}
          >
            SALVAR ODDS & LINKS
          </button>
        </form>
      )}

      {/* ── TAB: USUÁRIOS ─────────────────────────────────────── */}
      {tab === "users" && (
        <div style={{ border: "1px solid var(--border)" }}>
          <div
            className="grid grid-cols-12 px-4 py-2"
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderBottom: "2px solid var(--red)",
            }}
          >
            {["Nickname", "Nome", "Pts", "Role", "Ação"].map((h) => (
              <div
                key={h}
                className={`${h === "Nickname" ? "col-span-3" : h === "Nome" ? "col-span-4" : "col-span-1"} ${h === "Ação" ? "col-span-2 text-right" : ""}`}
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
          {userList.map((u, i) => (
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
              <div className="col-span-2">
                <span
                  className="font-condensed font-700 text-xs uppercase px-2 py-0.5"
                  style={{
                    backgroundColor:
                      u.role === "admin" ? "var(--red)" : "var(--bg-elevated)",
                    color:
                      u.role === "admin" ? "white" : "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {u.role}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <button
                  onClick={() => toggleBan(u.id, u.is_banned)}
                  className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-1.5 transition-all hover:opacity-70"
                  style={{
                    border: `1px solid ${u.is_banned ? "var(--border)" : "var(--red)"}`,
                    color: u.is_banned ? "var(--text-secondary)" : "var(--red)",
                  }}
                >
                  {u.is_banned ? "DESBANIR" : "BANIR"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: AUTO-SYNC ────────────────────────────────────── */}
      {tab === "sync" && (
        <form onSubmit={handleSyncResults} className="max-w-lg space-y-5">
          {/* Evento */}
          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              Evento
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                loadFights(e.target.value);
              }}
              style={selectStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            >
              {sortedEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          {/* UFCStats URL */}
          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              URL do Evento no UFCStats
              <span
                className="ml-2 font-400 normal-case"
                style={{ color: "var(--text-muted)", fontSize: "11px" }}
              >
                método + round
              </span>
            </label>
            <input
              value={syncForm.ufc_stats_url}
              onChange={(e) =>
                setSyncForm((f) => ({ ...f, ufc_stats_url: e.target.value }))
              }
              placeholder="http://www.ufcstats.com/event-details/babc6b5745335f18"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Busca em{" "}
              <a
                href="http://www.ufcstats.com/statistics/events/completed"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                ufcstats.com/statistics/events/completed
              </a>
            </p>
          </div>

          {/* ESPN Event ID (opcional) */}
          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              ESPN Event ID
              <span
                className="ml-2 font-400 normal-case"
                style={{ color: "var(--text-muted)", fontSize: "11px" }}
              >
                opcional — confirma vencedor
              </span>
            </label>
            <input
              value={syncForm.espn_event_id}
              onChange={(e) =>
                setSyncForm((f) => ({ ...f, espn_event_id: e.target.value }))
              }
              placeholder="600057364"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Visível na URL: espn.com/mma/fightcenter/_/id/
              <strong>600057364</strong>/league/ufc
            </p>
          </div>

          <button
            type="submit"
            disabled={syncLoading || !syncForm.ufc_stats_url}
            className="w-full py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--red)" }}
          >
            {syncLoading ? (
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
                IMPORTANDO RESULTADOS…
              </>
            ) : (
              "IMPORTAR RESULTADOS"
            )}
          </button>

          {/* Resultado da operação */}
          {syncResult && (
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
                {syncResult.message}
              </p>
              {syncResult.results?.map((r, i) => (
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
      )}

      {/* ── TAB: IMPORTAR ────────────────────────────────────── */}
      {tab === "import" && (
        <div className="max-w-2xl space-y-6">
          {/* URL input */}
          <div>
            <label
              className={labelClass}
              style={{ color: "var(--text-secondary)" }}
            >
              URL do Evento
            </label>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              Cole a URL de qualquer página do evento (ufc.com, ufc.com.br,
              tapology.com)
            </p>
            <div className="flex gap-2">
              <input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.ufc.com/event/ufc-fight-night-..."
                style={{ ...inputStyle, flex: 1 }}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <button
                onClick={handleScrape}
                disabled={importLoading}
                className="px-5 py-2 font-condensed font-900 text-xs uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                style={{ backgroundColor: "var(--red)" }}
              >
                {importLoading ? "BUSCANDO..." : "IMPORTAR"}
              </button>
            </div>
          </div>

          {/* Erro */}
          {importError && (
            <div
              className="p-4 rounded"
              style={{
                backgroundColor: "rgba(232,0,26,0.08)",
                border: "1px solid var(--red)",
              }}
            >
              <p
                className="font-condensed font-700 text-xs uppercase tracking-widest mb-1"
                style={{ color: "var(--red)" }}
              >
                ERRO
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {importError}
              </p>
            </div>
          )}

          {/* Preview dos dados */}
          {importData && (
            <div className="space-y-4">
              <div
                className="p-4 rounded space-y-2"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="font-condensed font-900 text-sm uppercase tracking-widest"
                  style={{ color: "var(--text)" }}
                >
                  {importData.event.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {importData.event.event_date} · {importData.event.location}
                </p>
                <p
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{ color: "var(--red)" }}
                >
                  {importData.fights.length} luta
                  {importData.fights.length !== 1 ? "s" : ""} encontrada
                  {importData.fights.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Lista de lutas */}
              <div className="space-y-2">
                {importData.fights.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 rounded"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <p
                        className="font-condensed font-700 text-sm uppercase"
                        style={{ color: "var(--text)" }}
                      >
                        {f.fighter_a.name}{" "}
                        <span style={{ color: "var(--red)" }}>vs</span>{" "}
                        {f.fighter_b.name}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {f.weight_class} · {f.card_type} · R{f.total_rounds}
                        {f.is_title_fight && (
                          <span
                            className="ml-2 px-1.5 py-0.5 text-white font-900"
                            style={{
                              backgroundColor: "var(--red)",
                              fontSize: "9px",
                            }}
                          >
                            TÍTULO
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className="font-condensed font-700 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      #{f.fight_order}
                    </span>
                  </div>
                ))}
              </div>

              {/* SQL gerado */}
              {importSql && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className="font-condensed font-700 text-xs uppercase tracking-widest"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      SQL GERADO — cole no Supabase SQL Editor
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          importSql.replace(/\n/g, "\n"),
                        );
                        toast.success("SQL copiado!");
                      }}
                      className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-1.5 transition-all hover:opacity-70"
                      style={{
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      COPIAR
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={importSql.replace(/\\n/g, "\n")}
                    rows={16}
                    className="w-full text-xs font-mono p-3 rounded resize-none"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                      outline: "none",
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
