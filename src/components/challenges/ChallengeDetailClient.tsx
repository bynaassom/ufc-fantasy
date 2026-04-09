"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/layout/Navbar";
import { getMethodLabel } from "@/lib/utils";
import { readApiResponse } from "@/lib/api";
import type {
  Challenge,
  ChallengeFightComparison,
  FightWithFighters,
  Pick,
  Profile,
} from "@/types";
import type { ChallengeResponse } from "@/types/api";

type ChallengeView = Challenge & {
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

function getStatusLabel(status: Challenge["status"]) {
  const labels: Record<Challenge["status"], string> = {
    pending: "Pendente",
    accepted: "Em andamento",
    declined: "Recusado",
    expired: "Expirado",
    completed: "Concluído",
  };
  return labels[status];
}

function getWinnerName(fight: FightWithFighters, winnerId: string) {
  if (fight.fighter_a.id === winnerId) return fight.fighter_a.name;
  if (fight.fighter_b.id === winnerId) return fight.fighter_b.name;
  return "Lutador";
}

function renderPickSummary(pick: Pick | null | undefined, fight: FightWithFighters) {
  if (!pick) {
    return {
      primary: "Sem pick",
      secondary: "Nenhuma escolha registrada",
      points: 0,
    };
  }

  return {
    primary: getWinnerName(fight, pick.picked_winner_id),
    secondary: `${getMethodLabel(pick.picked_method)} · R${pick.picked_round}`,
    points: pick.total_points,
  };
}

function FightComparisonRow({
  comparison,
  challengerName,
  challengedName,
}: {
  comparison: ChallengeFightComparison;
  challengerName: string;
  challengedName: string;
}) {
  const challengerPick = renderPickSummary(
    comparison.challengerPick || null,
    comparison.fight,
  );
  const challengedPick = renderPickSummary(
    comparison.challengedPick || null,
    comparison.fight,
  );

  return (
    <div
      className="p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p
            className="font-condensed font-900 text-sm uppercase tracking-wide"
            style={{ color: "var(--text)" }}
          >
            {comparison.fight.fighter_a.name} vs {comparison.fight.fighter_b.name}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {comparison.fight.weight_class}
          </p>
        </div>
        {comparison.fight.result_confirmed && comparison.fight.winner_id && (
          <span
            className="px-2 py-1 text-xs font-condensed font-900 uppercase tracking-widest text-white"
            style={{ backgroundColor: "#22c55e" }}
          >
            Resultado: {getWinnerName(comparison.fight, comparison.fight.winner_id)}
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
        <div
          className="p-4"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {challengerName}
          </p>
          <p
            className="font-condensed font-900 text-lg uppercase tracking-wide mt-2"
            style={{ color: "var(--text)" }}
          >
            {challengerPick.primary}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {challengerPick.secondary}
          </p>
          <p className="text-xs mt-3" style={{ color: "var(--red)" }}>
            {challengerPick.points} ponto(s) nesta luta
          </p>
        </div>

        <div className="flex items-center justify-center">
          <span
            className="font-condensed font-900 text-2xl uppercase"
            style={{ color: "var(--red)" }}
          >
            VS
          </span>
        </div>

        <div
          className="p-4"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {challengedName}
          </p>
          <p
            className="font-condensed font-900 text-lg uppercase tracking-wide mt-2"
            style={{ color: "var(--text)" }}
          >
            {challengedPick.primary}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {challengedPick.secondary}
          </p>
          <p className="text-xs mt-3" style={{ color: "var(--red)" }}>
            {challengedPick.points} ponto(s) nesta luta
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChallengeDetailClient({
  profile,
  userId,
  challenge,
  comparisons,
  picksVisible,
}: {
  profile: Profile;
  userId: string;
  challenge: ChallengeView;
  comparisons: ChallengeFightComparison[];
  picksVisible: boolean;
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const isIncomingPending =
    challenge.challenged_id === userId && challenge.status === "pending";

  async function handleRespond(action: "accept" | "decline") {
    setLoadingAction(action);
    try {
      await readApiResponse<ChallengeResponse>(
        await fetch(`/api/challenges/${challenge.id}`, {
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

  return (
    <div className="min-h-screen pb-24 md:pb-10" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar profile={profile} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <p
            className="font-condensed font-700 text-xs uppercase tracking-widest"
            style={{ color: "var(--text-secondary)" }}
          >
            {challenge.event.name}
          </p>
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-center mt-3">
            <div>
              <p
                className="font-condensed font-900 text-3xl uppercase tracking-wide"
                style={{ color: "var(--text)" }}
              >
                {challenge.challenger?.nickname || "Desafiante"}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                {challenge.challenger_points} ponto(s)
              </p>
            </div>
            <div className="text-center">
              <p
                className="font-condensed font-900 text-4xl uppercase"
                style={{ color: "var(--red)" }}
              >
                VS
              </p>
              <span
                className="inline-block mt-2 px-2 py-1 text-xs font-condensed font-900 uppercase tracking-widest"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                {getStatusLabel(challenge.status)}
              </span>
            </div>
            <div className="md:text-right">
              <p
                className="font-condensed font-900 text-3xl uppercase tracking-wide"
                style={{ color: "var(--text)" }}
              >
                {challenge.challenged?.nickname || "Desafiado"}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                {challenge.challenged_points} ponto(s)
              </p>
            </div>
          </div>

          {isIncomingPending && (
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={() => handleRespond("accept")}
                disabled={loadingAction === "accept"}
                className="px-5 py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-60"
                style={{ backgroundColor: "#22c55e" }}
              >
                {loadingAction === "accept" ? "Aceitando..." : "Aceitar desafio"}
              </button>
              <button
                onClick={() => handleRespond("decline")}
                disabled={loadingAction === "decline"}
                className="px-5 py-3 font-condensed font-900 text-sm uppercase tracking-widest"
                style={{
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                {loadingAction === "decline" ? "Recusando..." : "Recusar"}
              </button>
            </div>
          )}
        </div>

        {!picksVisible ? (
          <div
            className="p-6 text-center"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="font-condensed font-900 text-sm uppercase tracking-wide"
              style={{ color: "var(--text)" }}
            >
              Picks lado a lado liberam após o fechamento
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
              Assim que o prazo do evento terminar, esta página passa a exibir as
              escolhas dos dois jogadores e a pontuação atualizada conforme os
              resultados do card forem entrando.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comparisons.map((comparison) => (
              <FightComparisonRow
                key={comparison.fight.id}
                comparison={comparison}
                challengerName={challenge.challenger?.nickname || "Desafiante"}
                challengedName={challenge.challenged?.nickname || "Desafiado"}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
