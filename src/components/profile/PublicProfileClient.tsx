"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import Navbar from "@/components/layout/Navbar";
import BadgeIcon from "@/components/badges/BadgeIcon";
import { readApiResponse } from "@/lib/api";
import XpSummary from "@/components/profile/XpSummary";
import type { ChallengeResponse, CreateChallengePayload } from "@/types/api";
import type { Badge, Profile, PublicProfileStats, PublicProfileSummary, Rivalry, XpSummary as XpSummaryType } from "@/types";

export default function PublicProfileClient({
  viewerProfile,
  profile,
  stats,
  currentEvent,
  existingChallenge,
  canChallenge,
  badges,
  rivalry,
  xpSummary,
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
  badges: Badge[];
  rivalry: Rivalry | null;
  xpSummary: XpSummaryType;
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
    { label: "Desafios feitos", value: stats.challenges_total },
    { label: "Desafios vencidos", value: stats.challenges_won },
    { label: "Eventos", value: stats.events_played },
    { label: "Total de picks", value: stats.total_picks },
  ];

  const perfCards = [
    { label: "Acerto vencedor", value: `${stats.pick_accuracy}%` },
    { label: "Acerto método", value: `${stats.method_accuracy}%` },
    { label: "Acerto round", value: `${stats.round_accuracy}%` },
    { label: "Média pts/evento", value: stats.avg_points_per_event },
  ];

  const streakCards = [
    {
      label: "Streak atual",
      value: `${stats.current_streak}`,
      highlight: stats.current_streak >= 3,
    },
    {
      label: "Melhor streak",
      value: `${stats.best_streak}`,
      highlight: stats.best_streak >= 5,
    },
    {
      label: "Posição média",
      value: stats.average_rank ? `#${stats.average_rank}` : "Sem base",
    },
  ];

  return (
    <div className="min-h-[100dvh] md:pb-0" style={{ backgroundColor: "var(--bg)" }}>
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

        {/* Volume stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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

        {/* Accuracy stats */}
        <p
          className="font-condensed font-700 text-xs uppercase tracking-widest mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Precisão
        </p>
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {perfCards.map((stat) => (
            <div
              key={stat.label}
              className="p-4"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: "3px solid var(--green)",
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

        {/* Streak stats */}
        <p
          className="font-condensed font-700 text-xs uppercase tracking-widest mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Sequências
        </p>
        <section className="grid grid-cols-3 gap-3 mb-8">
          {streakCards.map((stat) => (
            <div
              key={stat.label}
              className="p-4"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${stat.highlight ? "var(--green)" : "var(--border)"}`,
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
                style={{ color: stat.highlight ? "var(--green)" : "var(--text)" }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        {/* XP summary */}
        <p
          className="font-condensed font-700 text-xs uppercase tracking-widest mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          XP e nível
        </p>
        <div className="mb-8">
          <XpSummary data={xpSummary} />
        </div>

        {/* Trophy case */}
        {badges.length > 0 && (
          <div className="mb-8">
            <p
              className="font-condensed font-700 text-xs uppercase tracking-widest mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              Conquistas recentes
            </p>
            <div className="flex gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center gap-1 p-3"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ color: "var(--red)", width: 40, height: 40 }}>
                    <BadgeIcon iconName={badge.icon_name} size={40} />
                  </div>
                  <p
                    className="font-condensed font-700 text-[10px] uppercase tracking-wider text-center leading-tight"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {badge.name}
                  </p>
                  <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
                    T{badge.tier}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rivalry */}
        {rivalry && (
          <div className="mb-8">
            <p
              className="font-condensed font-700 text-xs uppercase tracking-widest mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              Rivalidade
            </p>
            <div
              className="p-4"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: "3px solid var(--red)",
              }}
            >
              <p
                className="font-condensed font-900 text-lg uppercase tracking-wide"
                style={{ color: "var(--text)" }}
              >
                <span style={{ color: "var(--red)" }}>
                  {profile.nickname}
                </span>{" "}
                <span className="text-sm font-700" style={{ color: "var(--text-muted)" }}>
                  VS
                </span>{" "}
                <span style={{ color: "var(--green)" }}>{viewerProfile.nickname}</span>
              </p>
              <div className="flex gap-6 mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <span>
                  {profile.nickname}:{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {profile.id === rivalry.user_id_a
                      ? rivalry.user_a_wins
                      : rivalry.user_b_wins}
                  </strong>
                </span>
                <span>
                  Empates:{" "}
                  <strong style={{ color: "var(--text)" }}>{rivalry.draws}</strong>
                </span>
                <span>
                  {viewerProfile.nickname}:{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {viewerProfile.id === rivalry.user_id_a
                      ? rivalry.user_a_wins
                      : rivalry.user_b_wins}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}

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
