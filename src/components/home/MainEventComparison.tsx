import Link from "next/link";
import type { HomeFighter, HomeMainEvent } from "@/types";
import FighterHeadshotMedia from "./FighterHeadshotMedia";

function FighterVisual({ fighter, corner }: { fighter: HomeFighter; corner: "A" | "B" }) {
  return (
    <div className={`relative min-w-0 overflow-hidden ${corner === "A" ? "[clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]" : "[clip-path:polygon(0_0,100%_0,100%_100%,12%_100%)]"}`}>
      <div className={`absolute inset-0 opacity-25 ${corner === "A" ? "bg-gradient-to-tr from-[var(--corner-red)]" : "bg-gradient-to-tl from-[var(--corner-blue)]"}`} />
      <div className="absolute inset-x-0 bottom-0 h-4/5 opacity-60" style={{ background: "radial-gradient(ellipse at 50% 20%, var(--text-secondary) 0 12%, transparent 13%), linear-gradient(100deg, transparent 28%, var(--text-secondary) 29% 71%, transparent 72%)" }} />
      {fighter.imageUrl && (
        <FighterHeadshotMedia
          imageUrl={fighter.imageUrl}
          fighterName={fighter.name}
        />
      )}
      <div className="absolute inset-x-3 bottom-3 z-10 sm:inset-x-5 sm:bottom-4">
        <span className="font-condensed text-[10px] font-900 uppercase tracking-[0.2em] text-white/65">Corner {corner}</span>
        <h3 className="mt-1 max-w-[94%] truncate font-condensed text-[clamp(1.05rem,4vw,2rem)] font-900 uppercase leading-none text-white">{fighter.name}</h3>
      </div>
    </div>
  );
}

function statValue(value: number | null, fallback = "—") { return value == null ? fallback : String(value); }

function StatsColumn({ fighter, side }: { fighter: HomeFighter; side: "left" | "right" }) {
  const stats = fighter.stats;
  if (!stats || [stats.record, stats.winsByKoTko, stats.winsBySubmission, stats.firstRoundWins].every((value) => value == null)) {
    return <div className={`flex items-center ${side === "left" ? "justify-start" : "justify-end"}`}><span className="font-condensed text-[10px] font-800 uppercase tracking-[0.12em] text-[var(--text-muted)]">Dados indisponíveis</span></div>;
  }
  const rows = [
    ["Cartel", stats?.record ?? "—"],
    ["KO/TKO", statValue(stats?.winsByKoTko ?? null)],
    ["Finalizações", statValue(stats?.winsBySubmission ?? null)],
    ["1º round", statValue(stats?.firstRoundWins ?? null)],
  ];
  return <div className={`space-y-1 ${side === "left" ? "text-left" : "text-right"}`}>
    {rows.map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-2 border-b border-[var(--border-light)] py-1.5 last:border-0"><span className="font-condensed text-[10px] font-700 uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</span><strong className="font-condensed text-sm font-900 text-[var(--text)]">{value}</strong></div>)}
  </div>;
}

export default function MainEventComparison({ mainEvent }: { mainEvent: HomeMainEvent | null }) {
  if (!mainEvent) return null;
  return (
    <section className="home-reveal" aria-labelledby="main-event-heading">
      <div className="mb-3 flex items-end justify-between gap-3"><div><div className="red-line !mb-1"><h2 id="main-event-heading" className="section-title">Luta principal</h2></div><p className="font-condensed text-[10px] font-700 uppercase tracking-[0.16em] text-[var(--text-muted)]">{mainEvent.weightClass}{mainEvent.isTitleFight ? " · Disputa de cinturão" : ""}</p></div><Link href={`/event/${mainEvent.eventSlug}#fight-${mainEvent.fightId}`} className="min-tap px-2 font-condensed text-[10px] font-900 uppercase tracking-[0.14em] text-[var(--red)]">Ver confronto →</Link></div>
      <div className="overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="grid h-[176px] grid-cols-2 bg-[var(--hero-ink)] sm:h-[220px]"><FighterVisual fighter={mainEvent.fighterA} corner="A" /><FighterVisual fighter={mainEvent.fighterB} corner="B" /></div>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 border-t border-[var(--border)] p-3 sm:p-5">
          <StatsColumn fighter={mainEvent.fighterA} side="left" />
          <div className="flex w-[74px] max-w-[74px] flex-col items-center justify-center gap-2 px-1 sm:w-auto sm:max-w-none"><span className="font-condensed text-[10px] font-900 uppercase tracking-[0.14em] text-[var(--text-muted)]">VS</span><span className="h-16 w-px bg-[var(--border)]" /><span className="max-w-[74px] text-center font-condensed text-[8px] font-700 uppercase leading-[1.1] tracking-[0.06em] text-[var(--text-muted)] sm:max-w-none sm:whitespace-nowrap sm:text-[9px] sm:tracking-[0.08em]">Dados dos atletas: UFC.com</span></div>
          <StatsColumn fighter={mainEvent.fighterB} side="right" />
        </div>
      </div>
    </section>
  );
}
