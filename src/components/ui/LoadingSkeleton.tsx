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
  return (
    <>
      <div className="skeleton-nav hidden h-14 items-center border-b-[3px] px-6 md:flex" style={{ borderColor: "var(--red)" }} aria-hidden="true">
        <SkeletonBlock className="h-5 w-32" />
        <div className="mx-auto flex gap-8">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-2.5 w-14" />
          ))}
        </div>
        <SkeletonBlock className="h-8 w-28" />
      </div>
      <div className="skeleton-mobile-brand flex h-12 items-center border-b px-4 md:hidden" style={{ borderColor: "var(--border)" }} aria-hidden="true">
        <SkeletonBlock className="h-4 w-28" />
      </div>
      <div className="skeleton-mobile-nav fixed inset-x-0 bottom-0 z-10 grid h-14 grid-cols-5 border-t-2 md:hidden" style={{ borderColor: "var(--red)" }} aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center justify-center gap-1">
            <SkeletonBlock className="h-4 w-4" />
            <SkeletonBlock className="h-1.5 w-8" />
          </div>
        ))}
      </div>
    </>
  );
}

function PageHeading({ wide = false }: { wide?: boolean }) {
  return (
    <div className="mb-6">
      <SkeletonBlock className="mb-4 h-2.5 w-16" />
      <div className="flex items-center gap-3">
        <span className="h-7 w-1" style={{ backgroundColor: "var(--red)" }} aria-hidden="true" />
        <SkeletonBlock className={`h-8 ${wide ? "w-64 max-w-[75%]" : "w-40"}`} />
      </div>
    </div>
  );
}

function SectionLabel({ width = "w-32" }: { width?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3" aria-hidden="true">
      <span className="h-3 w-0.5" style={{ backgroundColor: "var(--red)" }} />
      <SkeletonBlock className={`h-2.5 ${width}`} />
    </div>
  );
}

function Tabs({ count = 3 }: { count?: number }) {
  return (
    <div className={`mb-6 grid ${count === 5 ? "grid-cols-5" : "grid-cols-3"} border`} style={{ borderColor: "var(--border)" }} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex h-11 items-center justify-center border-r last:border-r-0" style={{ borderColor: "var(--border)", backgroundColor: index === 0 ? "rgba(232,0,26,0.12)" : "var(--bg-card)" }}>
          <SkeletonBlock className="h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

function ListRows({ rows = 5, compact = false }: { rows?: number; compact?: boolean }) {
  return (
    <div className="border" style={{ borderColor: "var(--border)" }} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 ${compact ? "h-14" : "h-20"} border-b last:border-b-0`} style={{ borderColor: "var(--border-light)" }}>
          <SkeletonBlock className={compact ? "h-6 w-6" : "h-9 w-9"} />
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-36 max-w-[70%]" />
            <SkeletonBlock className="h-2 w-24 max-w-[55%]" />
          </div>
          <SkeletonBlock className="h-5 w-10" />
        </div>
      ))}
    </div>
  );
}

export function FightCardsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="border" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}>
          <div className="flex h-9 items-center justify-between border-b px-4" style={{ borderColor: "var(--border)" }}>
            <SkeletonBlock className="h-2.5 w-28" />
            <SkeletonBlock className="h-2.5 w-12" />
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-14 w-12 sm:h-16 sm:w-14" />
              <div className="hidden space-y-2 sm:block">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-2 w-12" />
              </div>
            </div>
            <SkeletonBlock className="h-5 w-7" />
            <div className="flex items-center justify-end gap-3">
              <div className="hidden space-y-2 sm:block">
                <SkeletonBlock className="ml-auto h-3 w-20" />
                <SkeletonBlock className="ml-auto h-2 w-12" />
              </div>
              <SkeletonBlock className="h-14 w-12 sm:h-16 sm:w-14" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-px border-t p-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--border)" }}>
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <SkeletonBlock key={itemIndex} className="h-9" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function HomePreset() {
  return (
    <>
      <div className="mb-8 border-b pb-6" style={{ borderColor: "var(--border)" }}>
        <SkeletonBlock className="mb-2 h-2.5 w-32" />
        <SkeletonBlock className="mb-2 h-8 w-56 max-w-[80%]" />
        <SkeletonBlock className="h-3 w-24" />
      </div>
      <SectionLabel width="w-24" />
      <SkeletonBlock className="skeleton-feature aspect-[16/7] w-full" />
      <div className="mb-10 flex h-16 items-center justify-between border border-t-0 px-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}>
        <div className="space-y-2"><SkeletonBlock className="h-2 w-36" /><SkeletonBlock className="h-2 w-24" /></div>
        <SkeletonBlock className="h-9 w-28" />
      </div>
      <SectionLabel width="w-36" />
      <ListRows rows={3} compact />
      <div className="mt-10"><SectionLabel width="w-28" /><ListRows rows={2} /></div>
    </>
  );
}

function EventPreset() {
  return (
    <>
      <PageHeading wide />
      <SkeletonBlock className="skeleton-feature mb-4 aspect-[16/6] w-full" />
      <div className="mb-7 grid grid-cols-3 gap-px" style={{ backgroundColor: "var(--border)" }}>
        {Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={index} className="h-14" />)}
      </div>
      <SectionLabel width="w-28" />
      <FightCardsSkeleton rows={3} />
    </>
  );
}

function RankingPreset() {
  return (
    <>
      <PageHeading />
      <Tabs />
      <div className="mb-5 grid grid-cols-[auto_1fr_auto] items-center gap-4 border border-l-[3px] p-4" style={{ borderColor: "var(--border)", borderLeftColor: "var(--red)", backgroundColor: "var(--bg-card)" }} aria-hidden="true">
        <SkeletonBlock className="h-9 w-12" />
        <div className="space-y-2"><SkeletonBlock className="h-3 w-32" /><SkeletonBlock className="h-2 w-20" /></div>
        <SkeletonBlock className="h-8 w-12" />
      </div>
      <ListRows rows={8} compact />
    </>
  );
}

function ProfilePreset() {
  return (
    <>
      <PageHeading />
      <div className="mb-6 flex items-center gap-4 border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }} aria-hidden="true">
        <SkeletonBlock className="h-16 w-16" />
        <div className="flex-1 space-y-2"><SkeletonBlock className="h-5 w-36" /><SkeletonBlock className="h-3 w-24" /><SkeletonBlock className="h-2 w-20" /></div>
      </div>
      <Tabs />
      <div className="space-y-4" aria-hidden="true">
        <SkeletonBlock className="h-14 w-full" />
        <SkeletonBlock className="h-14 w-full" />
        <SkeletonBlock className="h-11 w-36" />
      </div>
    </>
  );
}

function RecapPreset() {
  return (
    <>
      <PageHeading wide />
      <div className="mb-8 grid grid-cols-2 gap-px md:grid-cols-4" style={{ backgroundColor: "var(--border)" }} aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 p-4" style={{ backgroundColor: "var(--bg-card)" }}><SkeletonBlock className="h-8 w-12" /><SkeletonBlock className="h-2 w-20" /></div>
        ))}
      </div>
      <SectionLabel width="w-20" />
      <ListRows rows={5} compact />
      <div className="mt-8"><SectionLabel width="w-16" /><FightCardsSkeleton rows={2} /></div>
    </>
  );
}

function ChallengePreset() {
  return (
    <>
      <PageHeading wide />
      <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3" aria-hidden="true">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-10 w-12" />
        <SkeletonBlock className="h-28" />
      </div>
      <FightCardsSkeleton rows={2} />
    </>
  );
}

function AdminPreset() {
  return (
    <>
      <PageHeading />
      <Tabs count={5} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-24" />)}
      </div>
      <ListRows rows={6} compact />
    </>
  );
}

function LandingPreset() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6">
      <div className="flex h-16 items-center justify-between border-b" style={{ borderColor: "var(--border)" }} aria-hidden="true">
        <SkeletonBlock className="h-5 w-32" />
        <div className="flex gap-3"><SkeletonBlock className="h-9 w-20" /><SkeletonBlock className="h-9 w-24" /></div>
      </div>
      <div className="grid min-h-[60vh] items-center gap-8 py-10 md:grid-cols-[1.1fr_0.9fr]" aria-hidden="true">
        <div><SkeletonBlock className="mb-3 h-14 w-4/5 md:h-24" /><SkeletonBlock className="mb-6 h-4 w-2/3" /><SkeletonBlock className="h-12 w-52" /></div>
        <SkeletonBlock className="skeleton-feature aspect-[4/5] w-full" />
      </div>
    </div>
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
      ? "max-w-4xl"
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
    case "league": content = <><PageHeading /><div className="mb-6"><Tabs count={3} /></div><ListRows rows={lines} /></>; break;
    default: content = <><PageHeading /><ListRows rows={lines} /></>;
  }

  return (
    <div className="skeleton-stage min-h-[100dvh] pb-20 md:pb-0" style={{ backgroundColor: "var(--bg)" }} role="status" aria-busy="true" aria-label="Carregando conteúdo">
      <span className="sr-only">Carregando conteúdo…</span>
      {showAppChrome && <AppChrome />}
      {isLanding ? content : <main className={`${maxWidth} mx-auto px-4 py-8`}>{content}</main>}
    </div>
  );
}
