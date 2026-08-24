import BrandLogo from "@/components/ui/BrandLogo";

type PageSkeletonVariant =
  | "admin"
  | "challenge"
  | "event"
  | "home"
  | "landing"
  | "league"
  | "list"
  | "profile"
  | "ranking"
  | "recap"
  | "share";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

function AppChrome() {
  const navItems = ["Início", "Evento", "Ranking", "Desafios", "Ligas"];

  return (
    <>
      <header
        className="hidden h-14 items-center border-b-[3px] border-[var(--red)] bg-[var(--bg)] px-6 md:flex"
        aria-hidden="true"
      >
        <BrandLogo className="h-5 w-auto" priority />
        <div className="mx-auto flex items-center gap-8">
          {navItems.map((item, index) => (
            <span
              key={item}
              className={`font-condensed text-[10px] font-800 uppercase tracking-[0.16em] ${
                index === 0 ? "text-[var(--red)]" : "text-[var(--text-muted)]"
              }`}
            >
              {item}
            </span>
          ))}
        </div>
        <div className="flex h-8 w-8 items-center justify-center border border-[var(--border)] bg-[var(--bg-card)]">
          <span className="h-2 w-2 bg-[var(--red)]" />
        </div>
      </header>

      <header
        className="flex h-12 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-4 md:hidden"
        aria-hidden="true"
      >
        <BrandLogo className="h-4 w-auto" priority />
        <span className="font-condensed text-[9px] font-800 uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Fight night
        </span>
      </header>

      <div
        className="fixed inset-x-0 bottom-0 z-10 grid h-14 grid-cols-5 border-t-2 border-[var(--red)] bg-[var(--bg)] md:hidden"
        aria-hidden="true"
      >
        {navItems.map((item, index) => (
          <div key={item} className="flex flex-col items-center justify-center gap-1.5">
            <span className={`h-1.5 w-1.5 ${index === 0 ? "bg-[var(--red)]" : "bg-[var(--border)]"}`} />
            <span className="font-condensed text-[7px] font-800 uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {item}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function PageHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className="mb-6" aria-hidden="true">
      <span className="font-condensed text-[9px] font-900 uppercase tracking-[0.22em] text-[var(--red)]">
        {kicker}
      </span>
      <div className="mt-2 flex items-center gap-3">
        <span className="h-8 w-1 bg-[var(--red)]" />
        <h1 className="font-condensed text-3xl font-900 uppercase leading-none tracking-tight text-[var(--text)] sm:text-4xl">
          {title}
        </h1>
      </div>
    </header>
  );
}

function BroadcastStage({
  kicker,
  title,
  detail,
  compact = false,
  versus = false,
}: {
  kicker: string;
  title: string;
  detail: string;
  compact?: boolean;
  versus?: boolean;
}) {
  return (
    <div
      className={`broadcast-stage relative isolate overflow-hidden border border-[var(--border)] ${
        compact ? "min-h-[190px]" : "min-h-[300px] sm:min-h-[360px]"
      }`}
      aria-hidden="true"
    >
      <div className="broadcast-grid absolute inset-0" />
      <div className="broadcast-corner broadcast-corner-red absolute inset-y-0 left-0 w-[58%]" />
      <div className="broadcast-corner broadcast-corner-blue absolute inset-y-0 right-0 w-[58%]" />

      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 sm:left-6 sm:top-6">
        <span className="broadcast-loading-dot h-1.5 w-1.5 bg-[var(--red)]" />
        <span className="font-condensed text-[9px] font-900 uppercase tracking-[0.2em] text-white/65">
          Sincronizando
        </span>
      </div>

      {versus ? (
        <div className="absolute left-1/2 top-[44%] z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 rotate-45 items-center justify-center border border-white/25 bg-black/90">
          <span className="-rotate-45 font-condensed text-sm font-900 uppercase text-white">VS</span>
        </div>
      ) : (
        <div className="absolute left-1/2 top-[42%] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-[var(--corner-red)] sm:w-16" />
          <span className="font-condensed text-2xl font-900 uppercase italic tracking-[-0.06em] text-white/90 sm:text-4xl">
            UFCF
          </span>
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-[var(--corner-blue)] sm:w-16" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-black/65 px-4 py-4 backdrop-blur-[2px] sm:px-6 sm:py-5">
        <span className="font-condensed text-[9px] font-900 uppercase tracking-[0.2em] text-[var(--red)]">
          {kicker}
        </span>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <strong className="font-condensed text-[clamp(1.45rem,6vw,2.5rem)] font-900 uppercase leading-[0.9] tracking-tight text-white">
            {title}
          </strong>
          <span className="font-condensed text-[9px] font-700 uppercase tracking-[0.12em] text-white/50 sm:text-right">
            {detail}
          </span>
        </div>
      </div>
    </div>
  );
}

function SegmentStrip({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid ${count === 5 ? "grid-cols-5" : "grid-cols-3"} border border-[var(--border)]`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex h-10 items-center justify-center border-r border-[var(--border)] bg-[var(--bg-card)] last:border-r-0"
        >
          <span className={`h-0.5 w-10 ${index === 0 ? "bg-[var(--red)]" : "bg-[var(--border)]"}`} />
        </div>
      ))}
    </div>
  );
}

function ListRows({ rows = 5 }: { rows?: number }) {
  const visibleRows = Math.min(Math.max(rows, 2), 6);

  return (
    <div className="broadcast-list border border-[var(--border)] bg-[var(--bg-card)]" aria-hidden="true">
      {Array.from({ length: visibleRows }).map((_, index) => (
        <div
          key={index}
          className="grid min-h-[58px] grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--border-light)] px-4 last:border-b-0"
        >
          <span className="font-condensed text-sm font-900 tabular-nums text-[var(--text-muted)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="space-y-2">
            <SkeletonBlock className={`h-2.5 ${index % 2 === 0 ? "w-36" : "w-28"} max-w-[72%]`} />
            <span className="block h-px w-20 bg-[var(--border)]" />
          </div>
          <span className="h-2 w-8 bg-[var(--red)] opacity-35" />
        </div>
      ))}
    </div>
  );
}

export function FightCardsSkeleton({ rows = 3 }: { rows?: number }) {
  const visibleRows = Math.min(Math.max(rows, 1), 3);

  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: visibleRows }).map((_, index) => (
        <div key={index} className="broadcast-matchup overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex h-8 items-center justify-between border-b border-[var(--border)] px-3">
            <span className="font-condensed text-[8px] font-900 uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Luta {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-condensed text-[8px] font-800 uppercase tracking-[0.16em] text-[var(--red)]">
              Carregando
            </span>
          </div>
          <div className="relative isolate grid h-[92px] grid-cols-2 overflow-hidden bg-[var(--hero-ink)] sm:h-[108px]">
            <div className="broadcast-corner broadcast-corner-red relative flex items-end p-3">
              <div><span className="font-condensed text-[8px] font-900 uppercase tracking-[0.18em] text-[#ff5366]">Red corner</span><span className="mt-1 block h-1.5 w-20 bg-white/25" /></div>
            </div>
            <div className="broadcast-corner broadcast-corner-blue relative flex items-end justify-end p-3 text-right">
              <div><span className="font-condensed text-[8px] font-900 uppercase tracking-[0.18em] text-[#70a8ff]">Blue corner</span><span className="mt-1 block h-1.5 w-20 bg-white/25" /></div>
            </div>
            <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 items-center justify-center border border-white/20 bg-black/90">
              <span className="-rotate-45 font-condensed text-[8px] font-900 text-white">VS</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function HomePreset() {
  return (
    <>
      <PageHeading kicker="Fight night" title="Preparando sua arena" />
      <BroadcastStage
        kicker="Evento atual"
        title="Montando o card"
        detail="Lutas, horários e seus picks"
      />
    </>
  );
}

function EventPreset() {
  return (
    <>
      <PageHeading kicker="Evento" title="Card da noite" />
      <BroadcastStage
        kicker="Fight card"
        title="Chamando os atletas"
        detail="Sincronizando card e picks"
        compact
        versus
      />
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-3" aria-hidden="true"><span className="h-4 w-0.5 bg-[var(--red)]" /><span className="font-condensed text-[9px] font-900 uppercase tracking-[0.18em] text-[var(--text-muted)]">Próximas lutas</span></div>
        <FightCardsSkeleton rows={2} />
      </div>
    </>
  );
}

function RankingPreset() {
  return (
    <>
      <PageHeading kicker="Temporada atual" title="Ranking" />
      <SegmentStrip />
      <div className="mt-4"><ListRows rows={6} /></div>
    </>
  );
}

function ProfilePreset() {
  return (
    <>
      <PageHeading kicker="Corner" title="Perfil do jogador" />
      <BroadcastStage kicker="Identidade" title="Entrando no octógono" detail="Histórico, badges e desempenho" compact />
      <div className="mt-5"><SegmentStrip /></div>
    </>
  );
}

function RecapPreset() {
  return (
    <>
      <PageHeading kicker="Resultados" title="Resumo do evento" />
      <BroadcastStage kicker="Scorecard" title="Fechando as contas" detail="Pontos, acertos e desempenho" compact />
      <div className="mt-5"><ListRows rows={4} /></div>
    </>
  );
}

function ChallengePreset() {
  return (
    <>
      <PageHeading kicker="Head to head" title="Desafio" />
      <BroadcastStage kicker="Confronto" title="Preparando o duelo" detail="Jogador contra jogador" compact versus />
      <div className="mt-5"><FightCardsSkeleton rows={1} /></div>
    </>
  );
}

function AdminPreset() {
  return (
    <>
      <PageHeading kicker="Control room" title="Administração" />
      <SegmentStrip count={5} />
      <div className="mt-5"><ListRows rows={5} /></div>
    </>
  );
}

function LeaguePreset({ lines }: { lines: number }) {
  return (
    <>
      <PageHeading kicker="Competição" title="Ligas e desafios" />
      <SegmentStrip />
      <div className="mt-5"><ListRows rows={lines} /></div>
    </>
  );
}

function ListPreset({ lines }: { lines: number }) {
  return (
    <>
      <PageHeading kicker="UFC Fantasy" title="Carregando dados" />
      <ListRows rows={lines} />
    </>
  );
}

function LandingPreset() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[980px] items-center px-4 py-10 sm:px-8">
      <div className="w-full">
        <div className="mb-6 flex items-center justify-between" aria-hidden="true">
          <BrandLogo className="h-5 w-auto" priority />
          <span className="font-condensed text-[9px] font-900 uppercase tracking-[0.2em] text-[var(--red)]">Fight night</span>
        </div>
        <BroadcastStage kicker="UFC Fantasy" title="Entrando no octógono" detail="Preparando sua experiência" />
      </div>
    </main>
  );
}

export function PageSkeleton({
  variant = "list",
  lines = 5,
}: {
  variant?: PageSkeletonVariant;
  lines?: number;
}) {
  const isLanding = variant === "landing";
  const showAppChrome = variant !== "landing" && variant !== "share";
  const maxWidth = ["admin", "challenge", "league", "share"].includes(variant)
    ? "max-w-5xl"
    : variant === "home"
      ? "max-w-[1180px]"
      : variant === "profile"
        ? "max-w-lg"
        : "max-w-3xl";

  let content;
  switch (variant) {
    case "landing": content = <LandingPreset />; break;
    case "home": content = <HomePreset />; break;
    case "event": content = <EventPreset />; break;
    case "ranking": content = <RankingPreset />; break;
    case "profile": content = <ProfilePreset />; break;
    case "recap":
    case "share": content = <RecapPreset />; break;
    case "challenge": content = <ChallengePreset />; break;
    case "admin": content = <AdminPreset />; break;
    case "league": content = <LeaguePreset lines={lines} />; break;
    default: content = <ListPreset lines={lines} />;
  }

  return (
    <div
      className="broadcast-loader min-h-[100dvh] bg-[var(--bg)] pb-20 md:pb-0"
      role="status"
      aria-busy="true"
      aria-label="Carregando conteúdo"
    >
      <span className="sr-only">Carregando conteúdo…</span>
      {showAppChrome && <AppChrome />}
      {isLanding ? content : <main className={`${maxWidth} mx-auto px-4 py-7 sm:px-6 sm:py-9`}>{content}</main>}
    </div>
  );
}
