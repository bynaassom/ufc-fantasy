export default function ProfileLoading() {
  return (
    <div className="min-h-[100dvh]" style={{ backgroundColor: "var(--bg)" }}>
      <div
        className="h-14 mb-8"
        style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "3px solid var(--red)" }}
      />
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="skeleton h-10 w-40 mb-6" />
        <div className="skeleton h-24 w-full mb-6" />
        <div className="flex gap-0 mb-6">
          <div className="skeleton h-10 w-24" />
          <div className="skeleton h-10 w-24" />
          <div className="skeleton h-10 w-24" />
        </div>
        <div className="skeleton h-12 w-full mb-4" />
        <div className="skeleton h-12 w-full mb-4" />
      </main>
    </div>
  );
}
