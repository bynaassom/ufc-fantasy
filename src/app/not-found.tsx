"use client";

import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div className="mb-12 text-center">
        <span className="font-condensed font-900 text-sm uppercase tracking-widest">
          <span style={{ color: "var(--red)" }}>UFC</span>{" "}
          <span style={{ color: "var(--text)" }}>FANTASY</span>
        </span>
      </div>

      <h1
        className="font-condensed font-900 leading-none mb-4"
        style={{
          fontSize: "clamp(6rem, 20vw, 12rem)",
          color: "var(--red)",
          lineHeight: 0.85,
        }}
      >
        404
      </h1>

      <p
        className="font-condensed font-700 text-xl uppercase tracking-wide mb-3"
        style={{ color: "var(--text)" }}
      >
        Página não encontrada
      </p>

      <p
        className="text-sm mb-10 max-w-xs text-center"
        style={{ color: "var(--text-secondary)" }}
      >
        A página que você procura não existe ou foi removida.
      </p>

      <Link
        href="/home"
        className="font-condensed font-900 text-sm uppercase tracking-widest px-8 py-4 text-white transition-all hover:opacity-90 active:scale-95"
        style={{ backgroundColor: "var(--red)" }}
      >
        Ir para o início
      </Link>
    </main>
  );
}
