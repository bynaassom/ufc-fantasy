export default function HistoricoLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <div
        className="h-14 mb-8"
        style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "3px solid var(--red)" }}
      />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="skeleton h-10 w-48 mb-6 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-16 w-full mb-2 rounded" />
        ))}
      </main>
    </div>
  );
}
