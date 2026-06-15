"use client";

import { useMemo, useState, useEffect } from "react";
import { groupAdminEvents } from "@/lib/admin-event-groups";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import type { MainTab, SubTab } from "./types";
import { adminGet } from "./shared";

import EventsTab from "./tabs/EventsTab";
import FightsTab from "./tabs/FightsTab";
import ResultsTab from "./tabs/ResultsTab";
import FightersTab from "./tabs/FightersTab";
import SyncTab from "./tabs/SyncTab";
import UsersTab from "./tabs/UsersTab";
import BadgesTab from "./tabs/BadgesTab";
import AnalyticsTab from "./tabs/AnalyticsTab";

export default function AdminClient({
  events,
  users,
}: {
  events: any[];
  users: any[];
}) {
  const router = useRouter();
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
  const defaultEventId = useMemo(
    () => groupAdminEvents(sortedEvents)[0]?.events[0]?.id || "",
    [sortedEvents],
  );

  const [selectedEventId, setSelectedEventId] = useState(defaultEventId);
  const [eventFights, setEventFights] = useState<any[]>([]);
  const [userList, setUserList] = useState(users);

  useEffect(() => {
    if (selectedEventId) loadFights(selectedEventId);
  }, [selectedEventId]);

  async function loadFights(eventId: string) {
    try {
      const data = await adminGet<{ fights: any[] }>(
        `/api/admin/events/${eventId}/fights`,
      );
      setEventFights(data.fights || []);
    } catch (error: any) {
      toast.error(error.message);
      setEventFights([]);
    }
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

  function refreshEvents() {
    router.refresh();
  }

  const nav: {
    key: MainTab;
    label: string;
    subs: { key: SubTab; label: string }[];
  }[] = [
    { key: "eventos", label: "EVENTOS", subs: [
      { key: "evento-pendencias", label: "Pendências" },
      { key: "evento-manual", label: "Manual" },
      { key: "evento-importar", label: "Importar" },
      { key: "evento-editar", label: "Editar" },
    ]},
    { key: "lutas", label: "LUTAS", subs: [
      { key: "lutas-nova", label: "Nova Luta" },
      { key: "lutas-odds", label: "Odds" },
      { key: "lutas-links", label: "Links UFC" },
    ]},
    { key: "resultados", label: "RESULTADOS", subs: [
      { key: "res-auto", label: "Auto-Sync" },
      { key: "res-manual", label: "Manual" },
    ]},
    { key: "operacoes", label: "OPERAÇÕES", subs: [
      { key: "ops-lote", label: "Ações em Lote" },
      { key: "ops-fighters", label: "Mesclar Lutadores" },
      { key: "ops-fotos", label: "Fotos" },
      { key: "ops-auditoria", label: "Auditoria" },
    ]},
    { key: "badges", label: "BADGES", subs: [
      { key: "badges-list", label: "Lista" },
      { key: "badges-novo", label: "Novo" },
    ]},
    { key: "analytics", label: "ANALYTICS", subs: [
      { key: "analytics", label: "Dashboard" },
    ]},
    { key: "usuarios", label: "USUÁRIOS", subs: [] },
  ];

  const tabProps = {
    sortedEvents, selectedEventId, setSelectedEventId, eventFights, loadFights,
    onOpenSection: openAdminSection, onEventsChanged: refreshEvents,
    userList, setUserList, users: userList,
  };

  return (
    <div>
      <div className="mb-0 flex gap-0 overflow-x-auto" style={{ borderBottom: "1px solid var(--border)" }}>
        {nav.map((n) => (
          <button
            key={n.key}
            onClick={() => switchMain(n.key, n.subs[0]?.key || ("usuarios" as SubTab))}
            className="relative flex-shrink-0 font-condensed font-700 text-xs uppercase tracking-widest px-5 md:px-6 py-3 transition-all"
            style={{ color: mainTab === n.key ? "var(--red)" : "var(--text-muted)" }}
          >
            {n.label}
            {mainTab === n.key && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "var(--red)" }} />}
          </button>
        ))}
      </div>

      {nav.find((n) => n.key === mainTab)?.subs.length ? (
        <div className="mb-8 flex gap-0 overflow-x-auto" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-elevated)" }}>
          {nav.find((n) => n.key === mainTab)!.subs.map((s) => (
            <button
              key={s.key}
              onClick={() => setSubTab(s.key)}
              className="relative flex-shrink-0 font-condensed font-600 text-xs uppercase tracking-widest px-4 md:px-5 py-2.5 transition-all"
              style={{ color: subTab === s.key ? "var(--text)" : "var(--text-muted)" }}
            >
              {s.label}
              {subTab === s.key && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "var(--red)" }} />}
            </button>
          ))}
        </div>
      ) : <div className="mb-8" />}

      {subTab === "evento-pendencias" && <EventsTab subTab={subTab} {...tabProps} />}
      {subTab === "evento-manual" && <EventsTab subTab={subTab} {...tabProps} />}
      {subTab === "evento-importar" && <SyncTab onEventsChanged={refreshEvents} />}
      {subTab === "evento-editar" && <EventsTab subTab={subTab} {...tabProps} />}
      {subTab === "lutas-nova" && <FightsTab subTab={subTab} {...tabProps} />}
      {subTab === "lutas-odds" && <FightsTab subTab={subTab} {...tabProps} />}
      {subTab === "lutas-links" && <FightsTab subTab={subTab} {...tabProps} />}
      {subTab === "res-auto" && <ResultsTab subTab={subTab} {...tabProps} />}
      {subTab === "res-manual" && <ResultsTab subTab={subTab} {...tabProps} />}
      {subTab === "ops-lote" && <EventsTab subTab={subTab} {...tabProps} />}
      {subTab === "ops-fighters" && <FightersTab subTab={subTab} />}
      {subTab === "ops-fotos" && <FightersTab subTab={subTab} />}
      {subTab === "ops-auditoria" && <UsersTab subTab={subTab} {...tabProps} />}
      {subTab === "usuarios" && <UsersTab subTab={subTab} {...tabProps} />}
      {subTab === "badges-list" && <BadgesTab subTab={subTab} users={userList} />}
      {subTab === "badges-novo" && <BadgesTab subTab={subTab} users={userList} />}
      {subTab === "analytics" && <AnalyticsTab />}
    </div>
  );
}
