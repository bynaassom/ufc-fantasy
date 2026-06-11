"use client";

import { useEffect, useState } from "react";
import { groupAdminEvents } from "@/lib/admin-event-groups";
import toast from "react-hot-toast";
import FighterSearchInput from "../FighterSearchInput";

import {
  adminGet,
  adminSend,
  inp,
  sel,
  lbl,
  focus,
  blur,
  AdminEmptyState,
  WEIGHT_CLASSES,
  CARD_TYPES,
} from "../shared";
import type { SubTab, FightForm } from "../types";

// ─── Props ───────────────────────────────────────────────────
export default function FightsTab({
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
  switch (subTab) {
    case "lutas-nova":
      return (
        <LutasNova
          sortedEvents={sortedEvents}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          loadFights={loadFights}
        />
      );
    case "lutas-odds":
      return (
        <LutasOdds
          sortedEvents={sortedEvents}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          eventFights={eventFights}
          loadFights={loadFights}
        />
      );
    case "lutas-links":
      return (
        <LutasLinks
          sortedEvents={sortedEvents}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          eventFights={eventFights}
          loadFights={loadFights}
        />
      );
    default:
      return null;
  }
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
    try {
      await adminSend(`/api/admin/events/${selectedEventId}/fights`, {
        method: "POST",
        body: JSON.stringify(form),
      });
    } catch (error: any) {
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
    try {
      await adminSend(`/api/admin/fights/${fightId}`, {
        method: "PATCH",
        body: JSON.stringify({
          odds_a: form.odds_a || null,
          odds_b: form.odds_b || null,
        }),
      });
    } catch (error: any) {
      toast.error(error.message);
      return;
    }
    toast.success("Odds salvas!");
    setFightId("");
    setForm({ odds_a: "", odds_b: "" });
    loadFights(selectedEventId);
  }

  async function handleSaveAllOdds() {
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
    try {
      await adminSend(`/api/admin/events/${selectedEventId}/fights/odds`, {
        method: "PATCH",
        body: JSON.stringify({
          updates: changed.map((fight: any) => ({
            fightId: fight.id,
            odds_a: bulkOdds[fight.id]?.odds_a || null,
            odds_b: bulkOdds[fight.id]?.odds_b || null,
          })),
        }),
      });
      setSync({
        loading: false,
        msg: `${changed.length} luta(s) atualizadas em lote`,
      });
      toast.success(`${changed.length} luta(s) atualizadas em lote`);
      loadFights(selectedEventId);
    } catch (error: any) {
      setSync({ loading: false, msg: error.message });
      toast.error(error.message);
    }
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
              {preview.matches.slice(0, 8).map((match: any) => (
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
              Sem match: {preview.skipped.slice(0, 5).map((item: any) => item.fight_label).join(" · ")}
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
    try {
      await adminSend(`/api/admin/fights/${fightId}`, {
        method: "PATCH",
        body: JSON.stringify({ ufc_matchup_url: url || null }),
      });
    } catch (error: any) {
      toast.error(error.message);
      return;
    }
    toast.success("Link salvo!");
    setFightId("");
    setUrl("");
    loadFights(selectedEventId);
  }

  async function handleSaveAllLinks() {
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

    try {
      await adminSend(`/api/admin/events/${selectedEventId}/fights/links`, {
        method: "PATCH",
        body: JSON.stringify({
          updates: changed.map((fight: any) => ({
            fightId: fight.id,
            value: bulkLinks[fight.id] || null,
          })),
        }),
      });
      toast.success(`${changed.length} link(s) atualizados em lote`);
      loadFights(selectedEventId);
    } catch (error: any) {
      toast.error(error.message);
    }
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
