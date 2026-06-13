export default function LandingLoading() {
  return (
    <main
      className="min-h-[100dvh] flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      {/* Header placeholder */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="skeleton h-5 w-28" />
          <div className="flex items-center gap-3">
            <div className="skeleton h-9 w-20" />
            <div className="skeleton h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Hero skeleton */}
      <section
        className="relative w-full overflow-hidden flex items-center"
        style={{ minHeight: "60vh" }}
      >
        <div className="max-w-6xl mx-auto px-6 w-full">
          {/* Title skeleton */}
          <div className="skeleton h-32 w-3/5 mb-4" />
          <div className="skeleton h-5 w-72 mb-8" />
          <div className="skeleton h-12 w-52 mb-8" />

          {/* Stats grid skeleton */}
          <div
            className="grid max-w-2xl grid-cols-2 gap-px md:grid-cols-4"
            style={{ backgroundColor: "var(--border)" }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-3"
                style={{ backgroundColor: "var(--bg-card)" }}
              >
                <div className="skeleton h-8 w-16 mb-2" />
                <div className="skeleton h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features skeleton */}
      <section className="max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="skeleton h-5 w-36 mb-6" />
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-px"
          style={{ backgroundColor: "var(--border)" }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-8 flex flex-col gap-4"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              <div className="flex items-start justify-between">
                <div className="skeleton h-12 w-16" />
                <div className="skeleton h-6 w-14" />
              </div>
              <div className="skeleton h-5 w-44 mb-2" />
              <div className="skeleton h-4 w-full" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
