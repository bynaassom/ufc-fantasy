export default function JogadorLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <div
        className="h-14 mb-8"
        style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "3px solid var(--red)" }}
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="skeleton h-10 w-64 mb-6 rounded" />
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton rounded" style={{ height: 100 }} />
          ))}
        </div>
      </main>
    </div>
  );
}
