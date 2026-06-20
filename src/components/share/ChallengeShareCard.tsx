import type { ChallengeShareData } from "@/types";

export default function ChallengeShareCard({
  data,
}: {
  data: ChallengeShareData;
}) {
  const isCompleted = data.status === "completed";
  const headerEmoji = isCompleted ? "🏆" : "⚔️";
  const headerText = isCompleted ? "DESAFIO COMPLETO" : "DESAFIO LANCADO";

  const winnerNickname =
    isCompleted && data.result && !data.result.isDraw
      ? data.result.challengerScore > data.result.challengedScore
        ? data.challenger.nickname
        : data.challenged.nickname
      : null;

  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        backgroundColor: "var(--bg)",
        padding: "24px",
        width: 540,
        minHeight: 400,
      }}
    >
      <span style={{ fontSize: 48 }}>{headerEmoji}</span>
      <h2
        className="font-condensed font-900 text-2xl uppercase mt-2"
        style={{ color: "var(--red)" }}
      >
        {headerText}
      </h2>

      <div className="mt-6">
        <p
          className="font-condensed font-700 text-lg"
          style={{ color: "var(--text)" }}
        >
          {isCompleted
            ? `${data.result!.challengerScore} × ${data.result!.challengedScore}`
            : `${data.challenger.nickname} desafiou ${data.challenged.nickname}`}
        </p>

        {isCompleted && data.result && !data.result.isDraw && (
          <p
            className="font-condensed font-700 text-xl mt-1"
            style={{ color: "var(--red)" }}
          >
            {winnerNickname} venceu!
          </p>
        )}

        {isCompleted && data.result?.isDraw && (
          <p
            className="font-condensed font-700 text-xl mt-1"
            style={{ color: "var(--text)" }}
          >
            Empate!
          </p>
        )}

        <p
          className="font-condensed text-sm mt-2"
          style={{ color: "var(--text)" }}
        >
          {data.eventName}
        </p>
      </div>

      {data.templateLabel && (
        <div
          className="mt-6 px-6 py-3"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            border: "1px solid var(--red)",
          }}
        >
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--red)" }}
          >
            {data.templateLabel}
          </p>
        </div>
      )}
    </div>
  );
}
