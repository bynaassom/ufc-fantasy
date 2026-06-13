export default function ChatLoading() {
  return (
    <div
      className="min-h-screen pb-20 md:pb-0 flex items-center justify-center"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</p>
    </div>
  );
}
