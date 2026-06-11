export default function HistoricoEventoLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <div
        className="h-14 mb-8"
        style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "3px solid var(--red)" }}
      />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="skeleton h-6 w-64 mb-2 rounded" />
        <div className="skeleton h-10 w-80 mb-2 rounded" />
        <div className="skeleton h-4 w-48 mb-8 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton w-full mb-4 rounded" style={{ height: 200 }} />
        ))}
      </main>
    </div>
  );
}
