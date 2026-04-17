"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import Navbar from "@/components/layout/Navbar";
import { readApiResponse } from "@/lib/api";
import type { ChallengeResponse, CreateChallengePayload } from "@/types/api";
import type { Profile, PublicProfileStats, PublicProfileSummary } from "@/types";

export default function PublicProfileClient({
  viewerProfile,
  profile,
  stats,
  currentEvent,
  existingChallenge,
  canChallenge,
}: {
  viewerProfile: Profile;
  profile: PublicProfileSummary;
  stats: PublicProfileStats;
  currentEvent: {
    id: string;
    name: string;
    slug: string;
    picks_lock_at: string;
    status: "upcoming" | "live" | "completed";
  } | null;
  existingChallenge: { id: string } | null;
  canChallenge: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isMe = viewerProfile.id === profile.id;

  async function handleChallenge() {
    if (!currentEvent || !canChallenge) return;

    setLoading(true);
    try {
      const payload: CreateChallengePayload = {
        challengedId: profile.id,
        eventId: currentEvent.id,
      };
      const data = await readApiResponse<ChallengeResponse>(
        await fetch("/api/challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );

      toast.success("Desafio enviado!");
      router.push(`/desafios/${data.challenge.id}`);
    } catch (error: any) {
      toast.error(error.message || "Não foi possível criar o desafio.");
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      label: "Desafios feitos",
      value: stats.challenges_total,
    },
    {
      label: "Desafios vencidos",
      value: stats.challenges_won,
    },
    {
      label: "Acerto nas escolhas",
      value: `${stats.pick_accuracy}%`,
    },
    {
      label: "Posição média",
      value: stats.average_rank ? `#${stats.average_rank}` : "Sem base",
    },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-10" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar profile={viewerProfile} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p
                className="font-condensed font-700 text-xs uppercase tracking-widest"
                style={{ color: "var(--text-secondary)" }}
              >
                Perfil do jogador
              </p>
              <h1
                className="font-condensed font-900 text-3xl uppercase tracking-wide mt-1"
                style={{ color: "var(--text)" }}
              >
                <span style={{ color: "var(--red)" }}>{profile.nickname}</span>
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                {profile.first_name} {profile.last_name} · {profile.total_points} pontos
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {existingChallenge ? (
                <Link
                  href={`/desafios/${existingChallenge.id}`}
                  className="px-5 py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white"
                  style={{ backgroundColor: "var(--red)" }}
                >
                  Ver desafio atual
                </Link>
              ) : canChallenge ? (
                <button
                  onClick={handleChallenge}
                  disabled={loading}
                  className="px-5 py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-60"
                  style={{ backgroundColor: "var(--red)" }}
                >
                  {loading
                    ? "Enviando..."
                    : `Desafiar em ${currentEvent?.name || "evento atual"}`}
                </button>
              ) : (
                <div
                  className="px-5 py-3 text-sm"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  {isMe
                    ? "Você está vendo o próprio perfil."
                    : "Desafios indisponíveis neste momento."}
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="grid md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="p-4"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: "3px solid var(--red)",
              }}
            >
              <p
                className="font-condensed font-700 text-xs uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                {stat.label}
              </p>
              <p
                className="font-condensed font-900 text-3xl mt-2"
                style={{ color: "var(--text)" }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <section
          className="p-5"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="font-condensed font-900 text-sm uppercase tracking-wide"
            style={{ color: "var(--text)" }}
          >
            Desafio direto
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Assim que o desafio for aceito, os picks dos dois jogadores ficam
            vinculados ao evento selecionado. Depois do fechamento dos picks, a
            página VS mostra as escolhas lado a lado e a pontuação vai mudando
            junto com os resultados do card.
          </p>
          {currentEvent && (
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
              Evento atual para desafio: {currentEvent.name}
              {currentEvent.status === "live" ? " · ao vivo agora" : ""}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
