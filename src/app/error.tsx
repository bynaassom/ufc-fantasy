"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;

  return (
    <main
      className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-16"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div className="mb-12 text-center">
        <span className="font-condensed font-900 text-sm uppercase tracking-widest">
          <span style={{ color: "var(--red)" }}>UFC</span>{" "}
          <span style={{ color: "var(--text)" }}>FANTASY</span>
        </span>
      </div>

      <h1
        className="font-condensed font-900 text-4xl uppercase tracking-wide mb-4"
        style={{ color: "var(--red)" }}
      >
        Algo deu errado
      </h1>

      <p
        className="text-sm mb-10 max-w-xs text-center"
        style={{ color: "var(--text-secondary)" }}
      >
        Ocorreu um erro inesperado. Tente novamente.
      </p>

      <button
        onClick={reset}
        className="font-condensed font-900 text-sm uppercase tracking-widest px-8 py-4 text-white transition-all hover:opacity-90 active:scale-95"
        style={{ backgroundColor: "var(--red)" }}
      >
        Tentar novamente
      </button>
    </main>
  );
}
