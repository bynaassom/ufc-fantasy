"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    id: string;
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
    return { primary: "Sem pick", secondary: "Nenhuma escolha registrada", points: 0 };
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
  const challengerPick = renderPickSummary(comparison.challengerPick || null, comparison.fight);
  const challengedPick = renderPickSummary(comparison.challengedPick || null, comparison.fight);

  const challengerWon = challengerPick.points > challengedPick.points;
  const challengedWon = challengedPick.points > challengerPick.points;

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
            border: `1px solid ${challengerWon ? "#22c55e" : "var(--border)"}`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {challengerName}
            </p>
            {challengerWon && (
              <span className="text-[10px] font-condensed font-900 uppercase tracking-widest text-white px-1.5 py-0.5" style={{ backgroundColor: "#22c55e" }}>
                +1
              </span>
            )}
          </div>
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
            {challengerPick.points} pts
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
            border: `1px solid ${challengedWon ? "#22c55e" : "var(--border)"}`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {challengedName}
            </p>
            {challengedWon && (
              <span className="text-[10px] font-condensed font-900 uppercase tracking-widest text-white px-1.5 py-0.5" style={{ backgroundColor: "#22c55e" }}>
                +1
              </span>
            )}
          </div>
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
            {challengedPick.points} pts
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
  nextEvent,
}: {
  profile: Profile;
  userId: string;
  challenge: ChallengeView;
  comparisons: ChallengeFightComparison[];
  picksVisible: boolean;
  nextEvent: { id: string; name: string; slug: string; picks_lock_at: string } | null;
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [rematching, setRematching] = useState(false);
  const isIncomingPending = challenge.challenged_id === userId && challenge.status === "pending";
  const isDone = challenge.status === "completed" || challenge.status === "declined" || challenge.status === "expired";
  const isCompleted = challenge.status === "completed";
  const isUserChallenger = challenge.challenger_id === userId;
  const isUserWinner = challenge.winner_user_id === userId;
  const opponentId = isUserChallenger ? challenge.challenged_id : challenge.challenger_id;

  const { fightRecords, challengerFightWins, challengedFightWins } = useMemo(() => {
    if (!picksVisible) {
      return { fightRecords: [], challengerFightWins: 0, challengedFightWins: 0 };
    }
    let cWins = 0;
    let dWins = 0;
    const records = comparisons.map((c) => {
      const cPts = (c.challengerPick as Pick | null)?.total_points || 0;
      const dPts = (c.challengedPick as Pick | null)?.total_points || 0;
      const cWon = cPts > dPts;
      const dWon = dPts > cPts;
      if (cWon) cWins++;
      if (dWon) dWins++;
      return { fight: c.fight, challengerPts: cPts, challengedPts: dPts, challengerWon: cWon, challengedWon: dWon };
    });
    return { fightRecords: records, challengerFightWins: cWins, challengedFightWins: dWins };
  }, [comparisons, picksVisible]);

  async function handleRematch() {
    if (!nextEvent) return;
    setRematching(true);
    try {
      await readApiResponse<ChallengeResponse>(
        await fetch("/api/challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengedId: opponentId, eventId: nextEvent.id }),
        }),
      );
      toast.success("Rematch enviado!");
      router.push("/desafios");
    } catch (error: any) {
      toast.error(error.message || "Não foi possível criar o rematch.");
    } finally {
      setRematching(false);
    }
  }

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
      toast.success(action === "accept" ? "Desafio aceito!" : "Desafio recusado.");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Não foi possível responder ao desafio.");
    } finally {
      setLoadingAction(null);
    }
  }

  const challengerName = challenge.challenger?.nickname || "Desafiante";
  const challengedName = challenge.challenged?.nickname || "Desafiado";
  const isLeading = challenge.leader_user_id
    ? isUserChallenger
      ? challenge.leader_user_id === challenge.challenger_id
      : challenge.leader_user_id === challenge.challenged_id
    : null;

  return (
    <div className="min-h-screen pb-24 md:pb-10" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar profile={profile} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="font-condensed font-700 text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            {challenge.event.name}
          </p>

          {/* Scoreboard */}
          <div className="grid grid-cols-3 gap-3 mt-4 items-stretch">
            <div className="p-4 flex flex-col justify-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="font-condensed font-700 text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {challengerName}
              </p>
              <p className="font-condensed font-900 text-3xl mt-1" style={{ color: "var(--text)" }}>
                {challenge.challenger_points}
              </p>
              {picksVisible && (
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {challengerFightWins} luta(s)
                </p>
              )}
            </div>

            <div className="flex flex-col items-center justify-center gap-2">
              <p className="font-condensed font-900 text-3xl uppercase" style={{ color: "var(--red)" }}>
                VS
              </p>
              <span
                className="inline-block px-2 py-1 text-xs font-condensed font-900 uppercase tracking-widest"
                style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text)", border: "1px solid var(--border)" }}
              >
                {getStatusLabel(challenge.status)}
              </span>
              {isCompleted && challenge.leader_user_id && (
                <span
                  className="inline-block px-2 py-1 text-xs font-condensed font-900 uppercase tracking-widest text-white"
                  style={{ backgroundColor: isUserWinner ? "#22c55e" : "var(--red)" }}
                >
                  {isUserWinner ? "VOCÊ VENCEU" : "DERROTA"}
                </span>
              )}
              {!isDone && challenge.status !== "pending" && challenge.leader_user_id && (
                <span
                  className="inline-block px-2 py-1 text-xs font-condensed font-900 uppercase tracking-widest text-white"
                  style={{ backgroundColor: isLeading ? "#22c55e" : "var(--text-muted)" }}
                >
                  {isLeading ? "VENCENDO" : "PERDENDO"}
                </span>
              )}
            </div>

            <div className="p-4 flex flex-col justify-center md:text-right" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="font-condensed font-700 text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {challengedName}
              </p>
              <p className="font-condensed font-900 text-3xl mt-1" style={{ color: "var(--text)" }}>
                {challenge.challenged_points}
              </p>
              {picksVisible && (
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {challengedFightWins} luta(s)
                </p>
              )}
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
                style={{ backgroundColor: "var(--bg-card)", color: "var(--text)", border: "1px solid var(--border)" }}
              >
                {loadingAction === "decline" ? "Recusando..." : "Recusar"}
              </button>
            </div>
          )}

          {isDone && nextEvent && (
            <div className="mt-6">
              <button
                onClick={handleRematch}
                disabled={rematching}
                className="px-5 py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--red)" }}
              >
                {rematching ? "Enviando..." : `Rematch para ${nextEvent.name}`}
              </button>
              <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                Desafie {challenge.challenger?.nickname || challenge.challenged?.nickname || "seu oponente"} novamente
              </p>
            </div>
          )}
        </div>

        {/* Fight comparisons */}
        {!picksVisible ? (
          <div className="p-6 text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="font-condensed font-900 text-sm uppercase tracking-wide" style={{ color: "var(--text)" }}>
              Picks lado a lado liberam após o fechamento
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
              Assim que o prazo do evento terminar, esta página passa a exibir as
              escolhas dos dois jogadores e a pontuação atualizada conforme os
              resultados do card forem entrando.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {comparisons.map((comparison, idx) => (
                <div key={comparison.fight.id}>
                  <FightComparisonRow
                    comparison={comparison}
                    challengerName={challengerName}
                    challengedName={challengedName}
                  />
                  {/* Running score */}
                  <div className="flex items-center justify-end gap-2 mt-1 mb-4 px-1">
                    <span className="text-[10px] font-condensed font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      Placar parcial: {challengerName} {fightRecords[idx]?.challengerWon ? "+1" : ""}
                    </span>
                    <span className="text-xs font-condensed font-900" style={{ color: "var(--text)" }}>
                      {fightRecords.slice(0, idx + 1).filter((r) => r.challengerWon).length} x {fightRecords.slice(0, idx + 1).filter((r) => r.challengedWon).length}
                    </span>
                    <span className="text-[10px] font-condensed font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      {challengedName} {fightRecords[idx]?.challengedWon ? "+1" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-8 p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid var(--red)" }}>
              <p className="font-condensed font-900 text-sm uppercase tracking-wide" style={{ color: "var(--text)" }}>
                Sumário do confronto
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3" style={{ backgroundColor: "var(--bg-elevated)" }}>
                  <p className="font-condensed font-700 text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {challengerName}
                  </p>
                  <p className="font-condensed font-900 text-xl mt-1" style={{ color: "var(--text)" }}>
                    {challenge.challenger_points} pts
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    {challengerFightWins} lutas vencidas
                  </p>
                </div>
                <div className="p-3 text-right" style={{ backgroundColor: "var(--bg-elevated)" }}>
                  <p className="font-condensed font-700 text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {challengedName}
                  </p>
                  <p className="font-condensed font-900 text-xl mt-1" style={{ color: "var(--text)" }}>
                    {challenge.challenged_points} pts
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    {challengedFightWins} lutas vencidas
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
