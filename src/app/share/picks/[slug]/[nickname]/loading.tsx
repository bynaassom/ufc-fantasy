export default function SharePicksLoading() {
  return (
    <main className="min-h-[100dvh] px-4 py-8" style={{ backgroundColor: "var(--bg)" }}>
      <div className="mx-auto max-w-5xl">
        <div className="skeleton h-10 w-56 mb-6" />
        <div className="grid gap-2 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-28" />
          ))}
        </div>
        <div className="mt-8 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-24" />
          ))}
        </div>
      </div>
    </main>
  );
}
