"use client";

import { useState, useEffect, useMemo } from "react";

interface FighterStats {
  name: string;
  record: string;
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

function StatBar({
  valA,
  valB,
  label,
}: {
  valA: string;
  valB: string;
  label: string;
}) {
  const numA = parseFloat(valA?.replace(/[^0-9.]/g, "")) || 0;
  const numB = parseFloat(valB?.replace(/[^0-9.]/g, "")) || 0;
  const total = numA + numB;
  const pctA = total > 0 ? (numA / total) * 100 : 50;
  const aWins = numA > numB;
  const bWins = numB > numA;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className="w-14 text-left font-condensed text-base font-900 tabular-nums"
          style={{ color: aWins ? "var(--red-text)" : "var(--text-secondary)" }}
        >
          {valA || "--"}
        </span>
        <span
          className="flex-1 text-center font-condensed text-[11px] font-700 uppercase tracking-[0.12em]"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </span>
        <span
          className="w-14 text-right font-condensed text-base font-900 tabular-nums"
          style={{ color: bWins ? "var(--blue-text)" : "var(--text-secondary)" }}
        >
          {valB || "--"}
        </span>
      </div>
      <div
        className="flex h-1.5 overflow-hidden"
        style={{ backgroundColor: "var(--border)" }}
      >
        <div
          style={{
            width: `${pctA}%`,
            backgroundColor: aWins
              ? "var(--red)"
              : bWins
                ? "#4b5563"
                : "#4b5563",
            transition: "width 0.6s ease",
          }}
        />
        <div
          style={{
            width: `${100 - pctA}%`,
            backgroundColor: bWins ? "var(--blue)" : aWins ? "#4b5563" : "#4b5563",
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

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
      className="flex items-center justify-between py-2.5 gap-2"
      style={{ borderBottom: "1px solid var(--border-light)" }}
    >
      <span
        className="w-20 text-left font-condensed text-base font-900 tabular-nums"
        style={{ color: "var(--text)" }}
      >
        {valA || "--"}
      </span>
      <span
        className="flex-1 text-center font-condensed text-[11px] font-700 uppercase tracking-[0.12em]"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <span
        className="w-20 text-right font-condensed text-base font-900 tabular-nums"
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
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "confronto" | "vitoria" | "striking" | "grappling"
  >("confronto");
  const statsUrlA = useMemo(
    () => `/api/fighter-stats/${slugA}?name=${encodeURIComponent(nameA)}`,
    [slugA, nameA],
  );
  const statsUrlB = useMemo(
    () => `/api/fighter-stats/${slugB}?name=${encodeURIComponent(nameB)}`,
    [slugB, nameB],
  );

  useEffect(() => {
    if (!open || statsA) return;
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(statsUrlA, { signal: controller.signal }).then((r) => r.json()),
      fetch(statsUrlB, { signal: controller.signal }).then((r) => r.json()),
    ])
      .then(([a, b]) => {
        if (cancelled) return;
        if (a.error || b.error) {
          setError(true);
          return;
        }
        setStatsA(a);
        setStatsB(b);
      })
      .catch((fetchError) => {
        if (
          !cancelled &&
          !(fetchError instanceof DOMException && fetchError.name === "AbortError")
        ) {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, statsUrlA, statsUrlB, statsA]);

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "confronto", label: "CONFRONTO" },
    { key: "vitoria", label: "VITÓRIA POR" },
    { key: "striking", label: "GOLPES SIG." },
    { key: "grappling", label: "GRAPPLING" },
  ];

  const lastNameA = nameA.split(" ").pop() || nameA;
  const lastNameB = nameB.split(" ").pop() || nameB;
  const panelId = `fighter-stats-${slugA}-${slugB}`;

  return (
    <div>
      {/* Botão COMPARE */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-11 w-full items-center justify-center gap-2 py-2.5 font-condensed font-800 uppercase tracking-widest transition-all hover:opacity-80"
        style={{
          fontSize: "11px",
          letterSpacing: "0.08em",
          color: open ? "var(--red-text)" : "var(--text-secondary)",
          borderTop: "1px solid var(--border)",
          backgroundColor: open ? "rgba(232,0,26,0.04)" : "transparent",
        }}
      >
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
        </svg>
        {open ? "FECHAR" : "COMPARAR LUTADORES"}
        <svg
          aria-hidden="true"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Painel expandido — inline, não flutuante */}
      {open && (
        <div id={panelId} style={{ borderTop: "1px solid var(--border)" }}>
          {/* Cabeçalho com nomes */}
          <div
            className="grid grid-cols-3 px-4 py-2.5"
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              className="font-condensed font-900 text-xs uppercase tracking-wide truncate"
              style={{ color: "var(--red-text)" }}
            >
              {lastNameA}
            </span>
            <span
              className="text-center font-condensed text-[11px] font-800 uppercase tracking-[0.14em]"
              style={{ color: "var(--text-muted)" }}
            >
              STATS
            </span>
            <span
              className="font-condensed font-900 text-xs uppercase tracking-wide truncate text-right"
              style={{ color: "var(--blue-text)" }}
            >
              {lastNameB}
            </span>
          </div>

          {/* Tabs */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4"
            style={{
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
            }}
          >
            {tabs.map((t) => (
              <button
                type="button"
                key={t.key}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab(t.key);
                }}
                className="relative min-h-11 px-2 py-2.5 text-center font-condensed text-[11px] font-800 transition-all"
                style={{
                  letterSpacing: "0.04em",
                  color:
                    activeTab === t.key ? "var(--text)" : "var(--text-muted)",
                  backgroundColor:
                    activeTab === t.key ? "var(--bg-elevated)" : "transparent",
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

          {/* Conteúdo */}
          <div
            className="px-4 py-4"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            {loading && (
              <div className="flex items-center justify-center py-8" role="status" aria-label="Carregando estatísticas dos lutadores">
                <svg
                  aria-hidden="true"
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
            )}

            {error && (
              <p
                className="text-xs text-center py-4 font-condensed uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                Não foi possível carregar as stats
              </p>
            )}

            {!loading && !error && statsA && statsB && (
              <div className="space-y-3">
                {activeTab === "confronto" && (
                  <div>
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
                      label="ALCANCE PERNAS"
                    />
                  </div>
                )}

                {activeTab === "vitoria" && (
                  <div className="space-y-4">
                    <StatBar
                      valA={statsA.wins_by.ko.pct + "%"}
                      valB={statsB.wins_by.ko.pct + "%"}
                      label="KO/TKO"
                    />
                    <StatBar
                      valA={statsA.wins_by.sub.pct + "%"}
                      valB={statsB.wins_by.sub.pct + "%"}
                      label="FINALIZAÇÃO"
                    />
                    <StatBar
                      valA={statsA.wins_by.dec.pct + "%"}
                      valB={statsB.wins_by.dec.pct + "%"}
                      label="DECISÃO"
                    />
                    <div className="pt-1">
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

                {activeTab === "striking" && (
                  <div className="space-y-4">
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

                {activeTab === "grappling" && (
                  <div className="space-y-4">
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
