import Link from "next/link";
import type { HomeFighter, HomeMainEvent } from "@/types";
import FighterHeadshotMedia from "./FighterHeadshotMedia";

type Corner = "A" | "B";

function FighterVisual({ fighter, corner }: { fighter: HomeFighter; corner: Corner }) {
  const isRedCorner = corner === "A";

  return (
    <div className="relative min-w-0 overflow-hidden bg-[var(--hero-ink)]">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: isRedCorner
            ? "radial-gradient(circle at 78% 28%, rgba(232,0,26,0.26), transparent 34%), linear-gradient(125deg, #0b0b0b 12%, #2a090d 100%)"
            : "radial-gradient(circle at 22% 28%, rgba(40,120,255,0.26), transparent 34%), linear-gradient(235deg, #0b0b0b 12%, #081a36 100%)",
        }}
      />
      <div
        className={`absolute inset-y-0 w-[72%] opacity-20 ${
          isRedCorner ? "right-[-8%] -skew-x-12" : "left-[-8%] skew-x-12"
        }`}
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0 38px, rgba(255,255,255,0.18) 39px 40px)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black via-black/55 to-transparent" />

      {fighter.imageUrl && (
        <FighterHeadshotMedia
          imageUrl={fighter.imageUrl}
          fighterName={fighter.name}
          corner={corner}
        />
      )}

      <div
        className={`absolute inset-x-3 bottom-3 z-10 sm:inset-x-6 sm:bottom-5 ${
          isRedCorner ? "text-left" : "text-right"
        }`}
      >
        <span
          className={`font-condensed text-[9px] font-900 uppercase tracking-[0.22em] sm:text-[10px] ${
            isRedCorner ? "text-[#ff5366]" : "text-[#70a8ff]"
          }`}
        >
          {isRedCorner ? "Red corner" : "Blue corner"}
        </span>
        <h3
          className={`mt-1 line-clamp-2 text-balance font-condensed text-[clamp(1rem,4.4vw,2.5rem)] font-900 uppercase leading-[0.88] tracking-[-0.02em] text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.75)] ${
            isRedCorner ? "mr-auto max-w-full" : "ml-auto max-w-full"
          }`}
        >
          {fighter.name}
        </h3>
      </div>
    </div>
  );
}

function statValue(value: string | number | null | undefined) {
  return value == null || value === "" ? "—" : String(value);
}

function ComparisonTable({ fighterA, fighterB }: { fighterA: HomeFighter; fighterB: HomeFighter }) {
  const rows = [
    ["Cartel", statValue(fighterA.stats?.record), statValue(fighterB.stats?.record)],
    ["Vitórias por KO/TKO", statValue(fighterA.stats?.winsByKoTko), statValue(fighterB.stats?.winsByKoTko)],
    ["Vitórias por finalização", statValue(fighterA.stats?.winsBySubmission), statValue(fighterB.stats?.winsBySubmission)],
    ["Vitórias no 1º round", statValue(fighterA.stats?.firstRoundWins), statValue(fighterB.stats?.firstRoundWins)],
  ];

  return (
    <div role="table" aria-label={`Comparativo entre ${fighterA.name} e ${fighterB.name}`}>
      {rows.map(([label, valueA, valueB]) => (
        <div
          role="row"
          key={label}
          className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_minmax(116px,0.8fr)_minmax(0,1fr)] items-center border-b border-[var(--border-light)] px-3 last:border-b-0 sm:min-h-[58px] sm:grid-cols-[1fr_minmax(180px,0.65fr)_1fr] sm:px-6"
        >
          <strong
            role="cell"
            className="font-condensed text-lg font-900 tabular-nums text-[var(--text)] sm:text-2xl"
          >
            {valueA}
          </strong>
          <span
            role="rowheader"
            className="px-2 text-center font-condensed text-[9px] font-800 uppercase leading-tight tracking-[0.1em] text-[var(--text-muted)] sm:text-[10px] sm:tracking-[0.14em]"
          >
            {label}
          </span>
          <strong
            role="cell"
            className="text-right font-condensed text-lg font-900 tabular-nums text-[var(--text)] sm:text-2xl"
          >
            {valueB}
          </strong>
        </div>
      ))}
    </div>
  );
}

export default function MainEventComparison({ mainEvent }: { mainEvent: HomeMainEvent | null }) {
  if (!mainEvent) return null;

  return (
    <section
      className="home-reveal mx-auto w-full max-w-[1040px]"
      aria-labelledby="main-event-heading"
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="red-line !mb-1">
            <h2 id="main-event-heading" className="section-title">
              Luta principal
            </h2>
          </div>
          <p className="truncate font-condensed text-[10px] font-800 uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {mainEvent.weightClass}
            {mainEvent.isTitleFight ? " · Disputa de cinturão" : ""}
          </p>
        </div>
        <Link
          href={`/event/${mainEvent.eventSlug}#fight-${mainEvent.fightId}`}
          className="min-tap group inline-flex shrink-0 items-center gap-2 px-2 font-condensed text-[10px] font-900 uppercase tracking-[0.14em] text-[var(--red)]"
        >
          Ver confronto
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>

      <div className="overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
        <div className="relative grid h-[248px] grid-cols-2 overflow-hidden bg-[var(--hero-ink)] sm:h-[320px]">
          <FighterVisual fighter={mainEvent.fighterA} corner="A" />
          <FighterVisual fighter={mainEvent.fighterB} corner="B" />

          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 rotate-45 items-center justify-center border border-white/25 bg-black/90 shadow-[0_0_32px_rgba(0,0,0,0.7)] sm:h-14 sm:w-14">
            <span className="-rotate-45 font-condensed text-xs font-900 uppercase tracking-[0.08em] text-white sm:text-sm">
              VS
            </span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[3px] bg-gradient-to-r from-[var(--corner-red)] via-white/70 to-[var(--corner-blue)]" />
        </div>

        <ComparisonTable fighterA={mainEvent.fighterA} fighterB={mainEvent.fighterB} />
        <div className="flex items-center justify-center border-t border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5">
          <span className="font-condensed text-[9px] font-700 uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Dados oficiais dos atletas · UFC.com
          </span>
        </div>
      </div>
    </section>
  );
}
