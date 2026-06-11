export default function DesafiosLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <div
        className="h-14 mb-8"
        style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "3px solid var(--red)" }}
      />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-10 w-40 mb-6 rounded" />
        <div className="grid xl:grid-cols-[1.3fr,0.9fr] gap-6 mb-8">
          <div className="skeleton rounded" style={{ height: 300 }} />
          <div className="skeleton rounded" style={{ height: 300 }} />
        </div>
        <div className="skeleton h-6 w-32 mb-4 rounded" />
        <div className="grid lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton rounded" style={{ height: 160 }} />
          ))}
        </div>
      </main>
    </div>
  );
}
