"use client";

import { useState, useEffect } from "react";

interface FighterStats {
  name: string;
  slug: string;
  record: string;
  rank: string;
  striking: { slpm: string; sapm: string; strAcc: string; strDef: string };
  grappling: { tdAvg: string; tdAcc: string; tdDef: string; subAvg: string };
  other: { kdAvg: string; avgFightTime: string };
  wins_by: {
    ko: { count: string; pct: string };
    dec: { count: string; pct: string };
    sub: { count: string; pct: string };
  };
  physical: { height: string; weight: string; reach: string; legReach: string };
}

interface Props {
  slugA: string;
  slugB: string;
  nameA: string;
  nameB: string;
}

// Barra comparativa
function StatBar({
  valA,
  valB,
  label,
}: {
  valA: string;
  valB: string;
  label: string;
}) {
  const numA = parseFloat(valA?.replace(",", ".")) || 0;
  const numB = parseFloat(valB?.replace(",", ".")) || 0;
  const total = numA + numB;
  const pctA = total > 0 ? (numA / total) * 100 : 50;
  const pctB = total > 0 ? (numB / total) * 100 : 50;
  const aWins = numA > numB;
  const bWins = numB > numA;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span
          className="font-condensed font-700 text-sm"
          style={{ color: aWins ? "var(--red)" : "var(--text-secondary)" }}
        >
          {valA || "--"}
        </span>
        <span
          className="font-condensed font-600 text-xs uppercase tracking-widest text-center flex-1 px-2"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </span>
        <span
          className="font-condensed font-700 text-sm"
          style={{ color: bWins ? "#3b82f6" : "var(--text-secondary)" }}
        >
          {valB || "--"}
        </span>
      </div>
      <div
        className="flex h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--border)" }}
      >
        <div
          style={{
            width: `${pctA}%`,
            backgroundColor: aWins ? "var(--red)" : "#6b7280",
            transition: "width 0.5s ease",
          }}
        />
        <div
          style={{
            width: `${pctB}%`,
            backgroundColor: bWins ? "#3b82f6" : "#6b7280",
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

// Linha simples sem barra
function StatRow({
  valA,
  valB,
  label,
}: {
  valA: string;
  valB: string;
  label: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-2"
      style={{ borderBottom: "1px solid var(--border-light)" }}
    >
      <span
        className="font-condensed font-700 text-sm"
        style={{ color: "var(--text)" }}
      >
        {valA || "--"}
      </span>
      <span
        className="font-condensed font-600 text-xs uppercase tracking-widest text-center flex-1 px-2"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <span
        className="font-condensed font-700 text-sm"
        style={{ color: "var(--text)" }}
      >
        {valB || "--"}
      </span>
    </div>
  );
}

export default function FightStatsCompare({
  slugA,
  slugB,
  nameA,
  nameB,
}: Props) {
  const [open, setOpen] = useState(false);
  const [statsA, setStatsA] = useState<FighterStats | null>(null);
  const [statsB, setStatsB] = useState<FighterStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "confronto" | "vitoria" | "striking" | "grappling"
  >("confronto");

  useEffect(() => {
    if (!open || statsA) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/fighter-stats/${slugA}`).then((r) => r.json()),
      fetch(`/api/fighter-stats/${slugB}`).then((r) => r.json()),
    ])
      .then(([a, b]) => {
        setStatsA(a);
        setStatsB(b);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, slugA, slugB, statsA]);

  if (!slugA || !slugB) return null;

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "confronto", label: "CONFRONTO" },
    { key: "vitoria", label: "VITÓRIA POR" },
    { key: "striking", label: "GOLPES" },
    { key: "grappling", label: "GRAPPLING" },
  ];

  return (
    <div className="relative">
      {/* Botão STATS */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="font-condensed font-700 uppercase flex items-center gap-1 transition-opacity hover:opacity-70"
        style={{
          fontSize: "9px",
          letterSpacing: "0.06em",
          color: open ? "var(--red)" : "var(--text-muted)",
          pointerEvents: "all",
        }}
      >
        {open ? "✕" : "STATS"}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 left-1/2"
          style={{
            transform: "translateX(-50%)",
            top: "calc(100% + 8px)",
            width: "min(420px, 92vw)",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
        >
          {/* Header com nomes */}
          <div
            className="grid grid-cols-3 px-4 py-3"
            style={{
              borderBottom: "2px solid var(--red)",
              backgroundColor: "var(--bg-elevated)",
            }}
          >
            <span
              className="font-condensed font-900 text-xs uppercase tracking-wide truncate"
              style={{ color: "var(--red)" }}
            >
              {nameA.split(" ").pop()}
            </span>
            <span
              className="font-condensed font-700 text-xs uppercase tracking-widest text-center"
              style={{ color: "var(--text-muted)" }}
            >
              STATS
            </span>
            <span
              className="font-condensed font-900 text-xs uppercase tracking-wide truncate text-right"
              style={{ color: "#3b82f6" }}
            >
              {nameB.split(" ").pop()}
            </span>
          </div>

          {/* Tabs */}
          <div
            className="flex"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="flex-1 py-2 font-condensed font-700 text-center transition-all relative"
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.05em",
                  color:
                    activeTab === t.key ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: "var(--red)" }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <svg
                  className="animate-spin"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ color: "var(--red)" }}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
            ) : !statsA || !statsB ? (
              <p
                className="text-xs text-center py-4"
                style={{ color: "var(--text-muted)" }}
              >
                Erro ao carregar stats
              </p>
            ) : (
              <div className="space-y-3">
                {/* CONFRONTO */}
                {activeTab === "confronto" && (
                  <div className="space-y-2">
                    <StatRow
                      valA={statsA.record}
                      valB={statsB.record}
                      label="CARTEL"
                    />
                    <StatRow
                      valA={statsA.physical.height}
                      valB={statsB.physical.height}
                      label="ALTURA"
                    />
                    <StatRow
                      valA={statsA.physical.weight}
                      valB={statsB.physical.weight}
                      label="PESO"
                    />
                    <StatRow
                      valA={statsA.physical.reach}
                      valB={statsB.physical.reach}
                      label="ENVERGADURA"
                    />
                    <StatRow
                      valA={statsA.physical.legReach}
                      valB={statsB.physical.legReach}
                      label="ALCANCE DAS PERNAS"
                    />
                  </div>
                )}

                {/* VITÓRIA POR */}
                {activeTab === "vitoria" && (
                  <div className="space-y-3">
                    <StatBar
                      valA={statsA.wins_by.ko.pct + "%"}
                      valB={statsB.wins_by.ko.pct + "%"}
                      label="KO/TKO"
                    />
                    <StatBar
                      valA={statsA.wins_by.sub.pct + "%"}
                      valB={statsB.wins_by.sub.pct + "%"}
                      label="FIN"
                    />
                    <StatBar
                      valA={statsA.wins_by.dec.pct + "%"}
                      valB={statsB.wins_by.dec.pct + "%"}
                      label="DEC"
                    />
                    <div className="pt-2 space-y-2">
                      <StatRow
                        valA={statsA.other.avgFightTime}
                        valB={statsB.other.avgFightTime}
                        label="TEMPO MÉDIO"
                      />
                      <StatRow
                        valA={statsA.other.kdAvg}
                        valB={statsB.other.kdAvg}
                        label="MÉDIA KD"
                      />
                    </div>
                  </div>
                )}

                {/* GOLPES SIG. */}
                {activeTab === "striking" && (
                  <div className="space-y-3">
                    <StatBar
                      valA={statsA.striking.slpm}
                      valB={statsB.striking.slpm}
                      label="CONECTADOS/MIN"
                    />
                    <StatBar
                      valA={statsA.striking.strAcc + "%"}
                      valB={statsB.striking.strAcc + "%"}
                      label="PRECISÃO"
                    />
                    <StatBar
                      valA={statsA.striking.sapm}
                      valB={statsB.striking.sapm}
                      label="ABSORVIDOS/MIN"
                    />
                    <StatBar
                      valA={statsA.striking.strDef + "%"}
                      valB={statsB.striking.strDef + "%"}
                      label="DEFESA"
                    />
                  </div>
                )}

                {/* GRAPPLING */}
                {activeTab === "grappling" && (
                  <div className="space-y-3">
                    <StatBar
                      valA={statsA.grappling.tdAvg}
                      valB={statsB.grappling.tdAvg}
                      label="QUEDAS/15MIN"
                    />
                    <StatBar
                      valA={statsA.grappling.tdAcc + "%"}
                      valB={statsB.grappling.tdAcc + "%"}
                      label="PRECISÃO QUEDAS"
                    />
                    <StatBar
                      valA={statsA.grappling.tdDef + "%"}
                      valB={statsB.grappling.tdDef + "%"}
                      label="DEFESA QUEDAS"
                    />
                    <StatBar
                      valA={statsA.grappling.subAvg}
                      valB={statsB.grappling.subAvg}
                      label="FIN/15MIN"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
