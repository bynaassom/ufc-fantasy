export default function ChallengeDetailLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <div
        className="h-14 mb-8"
        style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "3px solid var(--red)" }}
      />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-6 w-48 mb-4 rounded" />
        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-center mb-8">
          <div className="skeleton h-12 w-48 rounded" />
          <div className="skeleton h-8 w-16 rounded" />
          <div className="skeleton h-12 w-48 rounded" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="skeleton w-full mb-4 rounded" style={{ height: 200 }} />
        ))}
      </main>
    </div>
  );
}
