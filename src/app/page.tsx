"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Event } from "@/types";

// ============================================================
// COLOQUE A URL DO BANNER DO EVENTO AQUI
// ============================================================
const EVENT_BANNER_URL = "";
// ============================================================

export default function LandingPage() {
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("*")
        .in("status", ["upcoming", "live"])
        .order("event_date", { ascending: true })
        .limit(1)
        .single();
      if (data) setCurrentEvent(data);
    }
    fetchEvent();
  }, []);

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      {/* ── HEADER ── */}
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="font-condensed font-900 text-2xl tracking-widest uppercase"
              style={{ color: "var(--red)" }}
            >
              UFC
            </span>
            <span
              className="font-condensed font-900 text-2xl tracking-widest uppercase"
              style={{ color: "var(--text)" }}
            >
              FANTASY
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="font-condensed font-700 text-sm uppercase tracking-widest px-5 py-2 transition-all hover:opacity-70"
              style={{ color: "var(--text-secondary)" }}
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="font-condensed font-700 text-sm uppercase tracking-widest px-5 py-2.5 text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--red)" }}
            >
              Registrar
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <section
        className="relative w-full overflow-hidden"
        style={{ minHeight: "60vh" }}
      >
        {EVENT_BANNER_URL ? (
          <div className="relative w-full" style={{ aspectRatio: "16/7" }}>
            <Image
              src={EVENT_BANNER_URL}
              alt={currentEvent?.name || "Evento"}
              fill
              className="object-cover"
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.2) 100%)",
              }}
            />
          </div>
        ) : (
          <div
            className="relative flex items-center"
            style={{
              minHeight: "60vh",
              backgroundColor: "var(--bg-secondary)",
            }}
          >
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, var(--border) 0px, var(--border) 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, var(--border) 0px, var(--border) 1px, transparent 1px, transparent 60px)",
              }}
            />
          </div>
        )}

        {/* Hero text overlay */}
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-6xl mx-auto px-6 w-full">
            <p
              className="font-condensed font-700 text-xs uppercase tracking-ultra mb-3"
              style={{ color: "var(--red)" }}
            >
              Plataforma de Fantasy
            </p>
            <h1
              className="uppercase leading-none mb-4"
              style={{
                fontFamily: "'Khand', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(4rem, 10vw, 9rem)",
                color: "var(--text)",
                letterSpacing: "-0.01em",
                lineHeight: 0.9,
              }}
            >
              FAÇA SEUS
              <br />
              <span style={{ color: "var(--red)" }}>PICKS</span>
            </h1>
            {currentEvent && (
              <p
                className="font-condensed font-700 uppercase tracking-widest text-lg mb-8"
                style={{ color: "var(--text-secondary)" }}
              >
                {currentEvent.name} · {currentEvent.location}
              </p>
            )}
            <Link
              href="/register"
              className="inline-flex items-center gap-3 font-condensed font-900 text-base uppercase tracking-widest px-8 py-4 text-white transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "var(--red)" }}
            >
              PARTICIPE AGORA
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SCORING INFO ── */}
      <section className="max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="red-line">
          <span className="section-title">Como funciona</span>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-px"
          style={{ backgroundColor: "var(--border)" }}
        >
          {[
            {
              num: "01",
              title: "ACERTE O VENCEDOR",
              desc: "Escolha quem você acha que vai ganhar cada luta do card.",
              pts: "+1 PT",
            },
            {
              num: "02",
              title: "ACERTE O MÉTODO",
              desc: "Decisão, finalização ou nocaute — seja preciso na via de vitória.",
              pts: "+1 PT",
            },
            {
              num: "03",
              title: "ACERTE O ROUND",
              desc: "Máxima precisão: em qual round a luta vai terminar.",
              pts: "+1 PT",
            },
          ].map((item) => (
            <div
              key={item.num}
              className="p-8 flex flex-col gap-4"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              <div className="flex items-start justify-between">
                <span
                  className="font-condensed font-900 text-5xl leading-none"
                  style={{ color: "var(--border)" }}
                >
                  {item.num}
                </span>
                <span
                  className="font-condensed font-900 text-sm px-3 py-1"
                  style={{ backgroundColor: "var(--red)", color: "white" }}
                >
                  {item.pts}
                </span>
              </div>
              <div>
                <p
                  className="font-condensed font-900 text-lg uppercase tracking-wide mb-2"
                  style={{ color: "var(--text)" }}
                >
                  {item.title}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-3 p-4 flex items-center justify-between"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            className="font-condensed font-700 text-sm uppercase tracking-widest"
            style={{ color: "var(--text-secondary)" }}
          >
            Máximo por luta
          </span>
          <span
            className="font-condensed font-900 text-2xl"
            style={{ color: "var(--red)" }}
          >
            3 PONTOS
          </span>
        </div>
      </section>

      {/* ── CTA BOTTOM ── */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p
              className="font-condensed font-900 text-2xl uppercase tracking-wide"
              style={{ color: "var(--text)" }}
            >
              Pronto para competir?
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Crie sua conta grátis e faça seus picks antes do lock.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="font-condensed font-700 text-sm uppercase tracking-widest px-6 py-3 transition-all hover:opacity-70"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              Já tenho conta
            </Link>
            <Link
              href="/register"
              className="font-condensed font-900 text-sm uppercase tracking-widest px-6 py-3 text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--red)" }}
            >
              Registre-se
            </Link>
          </div>
        </div>
      </section>

      <footer
        className="py-5 text-center"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <p
          className="text-xs uppercase tracking-widest font-condensed"
          style={{ color: "var(--text-muted)" }}
        >
          UFC FANTASY — NÃO AFILIADO AO UFC®
        </p>
      </footer>
    </main>
  );
}
