export default function AdminLoading() {
  return (
    <div className="min-h-[100dvh]" style={{ backgroundColor: "var(--bg)" }}>
      <div
        className="h-14 mb-8"
        style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "3px solid var(--red)" }}
      />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-10 w-52 mb-6" />
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-10 w-28" />
          ))}
        </div>
        <div className="skeleton w-full" style={{ height: 400 }} />
      </main>
    </div>
  );
}
