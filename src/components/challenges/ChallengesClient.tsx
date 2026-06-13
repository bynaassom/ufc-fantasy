"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import toast from "react-hot-toast";
import Navbar from "@/components/layout/Navbar";
import { readApiResponse } from "@/lib/api";
import type { Challenge, Notification, Profile } from "@/types";
import type { ChallengeResponse } from "@/types/api";

type ChallengeCard = Challenge & {
  event: {
    name: string;
    slug: string;
    picks_lock_at: string;
  };
  challenger: {
    id: string;
    nickname: string;
    first_name: string;
    last_name: string;
  } | null;
  challenged: {
    id: string;
    nickname: string;
    first_name: string;
    last_name: string;
  } | null;
  challenger_points: number;
  challenged_points: number;
  leader_user_id: string | null;
};

type ChallengeOpponent = {
  id: string;
  nickname: string;
  first_name: string;
  last_name: string;
  total_points: number;
  existingChallenge: {
    id: string;
    status: Challenge["status"];
  } | null;
};

function getStatusLabel(status: Challenge["status"]) {
  const labels: Record<Challenge["status"], string> = {
    pending: "Pendente",
    accepted: "Ativo",
    declined: "Recusado",
    expired: "Expirado",
    completed: "Encerrado",
  };
  return labels[status];
}

function getStatusColor(status: Challenge["status"]) {
  const colors: Record<Challenge["status"], string> = {
    pending: "var(--red)",
    accepted: "var(--green)",
    declined: "var(--text-muted)",
    expired: "var(--text-muted)",
    completed: "var(--text-muted)",
  };
  return colors[status];
}

function ChallengeCardItem({
  challenge,
  userId,
  onRespond,
  loadingAction,
}: {
  challenge: ChallengeCard;
  userId: string;
  onRespond: (challengeId: string, action: "accept" | "decline") => void;
  loadingAction: string | null;
}) {
  const isIncoming =
    challenge.challenged_id === userId && challenge.status === "pending";
  const challengerLabel =
    challenge.challenger_id === userId
      ? `${challenge.challenger?.nickname || "Você"} (você)`
      : challenge.challenger?.nickname || "Desafiante";
  const challengedLabel =
    challenge.challenged_id === userId
      ? `${challenge.challenged?.nickname || "Você"} (você)`
      : challenge.challenged?.nickname || "Desafiado";

  return (
    <div
      className="p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="font-condensed font-900 text-sm uppercase tracking-wide"
            style={{ color: "var(--text)" }}
          >
            {challengerLabel}{" "}
            <span style={{ color: "var(--text-muted)" }}>vs</span>{" "}
            {challengedLabel}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {challenge.event.name}
          </p>
        </div>
        <span
          className="px-2 py-1 text-xs font-condensed font-900 uppercase tracking-widest"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: getStatusColor(challenge.status),
            border: `1px solid ${getStatusColor(challenge.status)}`,
          }}
        >
          {getStatusLabel(challenge.status)}
        </span>
      </div>

      {challenge.status !== "pending" && (
        <div
          className="grid grid-cols-2 gap-3 mt-4"
          style={{ color: "var(--text)" }}
        >
          <div
            className="p-3"
            style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {challenge.challenger?.nickname || "Desafiante"}
            </p>
            <p className="font-condensed font-900 text-2xl mt-1">
              {challenge.challenger_points}
            </p>
          </div>
          <div
            className="p-3"
            style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {challenge.challenged?.nickname || "Desafiado"}
            </p>
            <p className="font-condensed font-900 text-2xl mt-1">
              {challenge.challenged_points}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-4">
        <Link
          href={`/desafios/${challenge.id}`}
          className="px-4 py-2 text-xs font-condensed font-900 uppercase tracking-widest text-white"
          style={{ backgroundColor: "var(--red)" }}
        >
          Abrir VS
        </Link>

        {isIncoming && (
          <>
            <button
              onClick={() => onRespond(challenge.id, "accept")}
              disabled={loadingAction === `accept:${challenge.id}`}
              className="px-4 py-2 text-xs font-condensed font-900 uppercase tracking-widest text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--green)" }}
            >
              {loadingAction === `accept:${challenge.id}` ? "Aceitando..." : "Aceitar"}
            </button>
            <button
              onClick={() => onRespond(challenge.id, "decline")}
              disabled={loadingAction === `decline:${challenge.id}`}
              className="px-4 py-2 text-xs font-condensed font-900 uppercase tracking-widest"
              style={{
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
            >
              {loadingAction === `decline:${challenge.id}` ? "Recusando..." : "Recusar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ChallengesClient({
  profile,
  userId,
  currentEvent,
  opponents,
  incoming,
  outgoing,
  active,
  history,
  notifications,
  unreadCount,
}: {
  profile: Profile;
  userId: string;
  currentEvent: {
    id: string;
    name: string;
    slug: string;
    picks_lock_at: string;
    status: "upcoming" | "live" | "completed";
  } | null;
  opponents: ChallengeOpponent[];
  incoming: ChallengeCard[];
  outgoing: ChallengeCard[];
  active: ChallengeCard[];
  history: ChallengeCard[];
  notifications: Notification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  async function handleRespond(challengeId: string, action: "accept" | "decline") {
    setLoadingAction(`${action}:${challengeId}`);
    try {
      await readApiResponse<ChallengeResponse>(
        await fetch(`/api/challenges/${challengeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }),
      );

      toast.success(
        action === "accept" ? "Desafio aceito!" : "Desafio recusado.",
      );
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Não foi possível responder ao desafio.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleCreateChallenge(challengedId: string) {
    if (!currentEvent) return;

    setCreatingFor(challengedId);
    try {
      const data = await readApiResponse<ChallengeResponse>(
        await fetch("/api/challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengedId,
            eventId: currentEvent.id,
          }),
        }),
      );

      toast.success("Desafio enviado!");
      router.push(`/desafios/${data.challenge.id}`);
    } catch (error: any) {
      toast.error(error.message || "Não foi possível criar o desafio.");
    } finally {
      setCreatingFor(null);
    }
  }

  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredOpponents = opponents.filter((opponent) => {
    if (!normalizedSearch) return true;

    const haystack = [
      opponent.nickname,
      opponent.first_name,
      opponent.last_name,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  const sections = [
    { title: "Recebidos", items: incoming },
    { title: "Enviados", items: outgoing },
    { title: "Em andamento", items: active },
    { title: "Histórico", items: history },
  ];

  return (
    <div className="min-h-[100dvh] pb-24 md:pb-0" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar profile={profile} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/home" className="inline-flex items-center gap-1 mb-4" style={{ color: "var(--text-muted)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-xs font-condensed font-700 uppercase tracking-wider">Início</span>
        </Link>
        <div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="red-line">
            <span className="section-title" style={{ fontSize: "1.75rem" }}>
              DESAFIOS
            </span>
          </div>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            {`${unreadCount} notificação${unreadCount !== 1 ? 'ões' : ''} não lida${unreadCount !== 1 ? 's' : ''} no sino.`}
          </p>
        </div>

        <section className="mb-8">
          <div className="grid xl:grid-cols-[1.3fr,0.9fr] gap-6">
            <div
              className="p-4 md:p-5"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: "3px solid var(--red)",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p
                    className="font-condensed font-900 text-sm uppercase tracking-wide"
                    style={{ color: "var(--text)" }}
                  >
                    Novo desafio
                  </p>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    {currentEvent
                      ? `Crie desafios para ${currentEvent.name} e mantenha o duelo valendo durante todo o evento.`
                      : "Quando houver um evento atual, você poderá lançar novos desafios por aqui."}
                  </p>
                </div>
                {currentEvent && (
                  <span
                    className="px-2 py-1 text-xs font-condensed font-900 uppercase tracking-widest"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      color: currentEvent.status === "live" ? "var(--green)" : "var(--red)",
                      border: `1px solid ${
                        currentEvent.status === "live" ? "var(--green)" : "var(--red)"
                      }`,
                    }}
                  >
                    {currentEvent.status === "live" ? "Evento ao vivo" : "Evento atual"}
                  </span>
                )}
              </div>

              {!currentEvent ? (
                <div
                  className="mt-4 p-4"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  Não há evento em andamento ou próximo para abrir desafios agora.
                </div>
              ) : (
                <>
                  <div className="mt-4">
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar por nickname ou nome"
                      className="w-full px-4 py-3 text-sm outline-none"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>

                  <div className="mt-4 grid md:grid-cols-2 gap-3">
                    {filteredOpponents.length === 0 ? (
                      <div
                        className="md:col-span-2 p-4 text-sm"
                        style={{
                          backgroundColor: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          color: "var(--text-muted)",
                        }}
                      >
                        Nenhum jogador encontrado com esse filtro.
                      </div>
                    ) : (
                      filteredOpponents.map((opponent) => (
                        <div
                          key={opponent.id}
                          className="p-4"
                          style={{
                            backgroundColor: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Link
                                href={`/jogador/${opponent.nickname}`}
                                className="font-condensed font-900 text-sm uppercase tracking-wide transition-opacity hover:opacity-80"
                                style={{ color: "var(--text)" }}
                              >
                                {opponent.nickname}
                              </Link>
                              <p
                                className="text-xs mt-1 uppercase tracking-widest"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {opponent.first_name} {opponent.last_name}
                              </p>
                            </div>
                            <span
                              className="font-condensed font-900 text-lg"
                              style={{ color: "var(--text)" }}
                            >
                              {opponent.total_points}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 mt-4">
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                              {opponent.existingChallenge
                                ? "Já existe um desafio aberto entre vocês neste evento."
                                : "Sem desafio aberto neste evento."}
                            </p>

                            {opponent.existingChallenge ? (
                              <Link
                                href={`/desafios/${opponent.existingChallenge.id}`}
                                className="px-3 py-2 text-xs font-condensed font-900 uppercase tracking-widest text-white whitespace-nowrap"
                                style={{ backgroundColor: "var(--red)" }}
                              >
                                Ver desafio
                              </Link>
                            ) : (
                              <button
                                onClick={() => handleCreateChallenge(opponent.id)}
                                disabled={creatingFor === opponent.id}
                                className="px-3 py-2 text-xs font-condensed font-900 uppercase tracking-widest text-white whitespace-nowrap disabled:opacity-60"
                                style={{ backgroundColor: "var(--red)" }}
                              >
                                {creatingFor === opponent.id ? "Enviando..." : "Desafiar"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div
              className="p-4"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: "3px solid var(--red)",
              }}
            >
              <p
                className="font-condensed font-900 text-sm uppercase tracking-wide"
                style={{ color: "var(--text)" }}
              >
                Últimas notificações
              </p>
              <div className="mt-3 space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Nenhuma notificação recente.
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.target_path || "/desafios"}
                      className="block p-3"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p
                        className="font-condensed font-900 text-xs uppercase tracking-widest"
                        style={{ color: "var(--text)" }}
                      >
                        {notification.title}
                      </p>
                      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        {notification.message}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <div className="red-line mb-4">
                <span className="section-title text-sm">{section.title}</span>
              </div>
              {section.items.length === 0 ? (
                <div
                  className="p-6 text-center"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  Nada por aqui ainda.
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-4">
                  {section.items.map((challenge) => (
                    <ChallengeCardItem
                      key={challenge.id}
                      challenge={challenge}
                      userId={userId}
                      onRespond={handleRespond}
                      loadingAction={loadingAction}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
