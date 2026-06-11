export default function HomeLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <div
        className="h-14 mb-8"
        style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "3px solid var(--red)" }}
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="skeleton h-3 w-32 mb-2 rounded" />
          <div className="skeleton h-8 w-48 rounded" />
          <div className="skeleton h-4 w-24 mt-2 rounded" />
        </div>
        <div className="mb-10">
          <div className="skeleton h-6 w-40 mb-4 rounded" />
          <div className="skeleton w-full rounded" style={{ aspectRatio: "16/6" }} />
        </div>
      </main>
    </div>
  );
}
