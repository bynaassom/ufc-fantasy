export default function HomeLoading() {
  return (
    <div className="min-h-[100dvh] pb-20 md:pb-0" style={{ backgroundColor: "var(--bg)" }}>
      {/* Navbar placeholder */}
      <div className="h-14 mb-8" style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "3px solid var(--red)" }} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="skeleton h-3 w-40 mb-2" />
          <div className="skeleton h-8 w-56 mb-2" />
          <div className="skeleton h-4 w-32" />
        </div>

        {/* Current Event banner skeleton */}
        <div className="mb-10">
          <div className="skeleton h-3 w-28 mb-3" />
          <div className="skeleton w-full" style={{ aspectRatio: "16/6" }} />
          <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: "var(--bg-card)", borderLeft: "3px solid var(--border)" }}>
            <div className="skeleton h-3 w-40" />
            <div className="skeleton h-8 w-28" />
          </div>
        </div>

        {/* Activity Feed skeleton */}
        <div className="mb-10">
          <div className="skeleton h-3 w-32 mb-4" />
          <div className="skeleton h-16 w-full mb-2" />
          <div className="skeleton h-16 w-full mb-2" />
          <div className="skeleton h-16 w-full" />
        </div>

        {/* Challenges skeleton */}
        <div className="mb-10">
          <div className="skeleton h-3 w-36 mb-4" />
          <div className="skeleton h-20 w-full mb-2" />
        </div>

        {/* Upcoming events skeleton */}
        <div className="mb-10">
          <div className="skeleton h-3 w-32 mb-4" />
          <div className="skeleton h-14 w-full mb-1" />
          <div className="skeleton h-14 w-full" />
        </div>
      </main>
    </div>
  );
}
