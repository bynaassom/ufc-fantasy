export function PageSkeleton({ lines = 6 }: { lines?: number }) {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col" style={{ padding: "16px" }}>
      {/* Header shimmer */}
      <div className="skeleton h-8 w-3/5 mb-6" />
      {/* Cards shimmer */}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton w-full h-20 mb-3" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return <div className="skeleton w-full h-20" />;
}
