import type { ChallengeShareData } from "@/types";

export default function ChallengeSharePage({
  data,
}: {
  data: ChallengeShareData;
}) {
  const isCompleted = data.status === "completed";

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center py-8"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      <div className="text-center space-y-4">
        <h1 className="font-condensed font-900 text-3xl uppercase" style={{ color: "var(--red)" }}>
          {isCompleted ? "DESAFIO COMPLETO" : "DESAFIO LANCADO"}
        </h1>

        <div className="space-y-2">
          <p className="font-condensed font-700 text-xl">
            {data.challenger.nickname} × {data.challenged.nickname}
          </p>
          <p className="font-condensed text-sm" style={{ color: "var(--text-muted)" }}>
            {data.eventName}
          </p>

          {data.templateLabel && (
            <div className="inline-block px-4 py-2 border" style={{ borderColor: "var(--red)", backgroundColor: "rgba(239,68,68,0.1)" }}>
              <p className="font-condensed font-700 text-sm uppercase" style={{ color: "var(--red)" }}>
                {data.templateLabel}
              </p>
            </div>
          )}

          {isCompleted && data.result && (
            <p className="font-condensed font-700 text-2xl" style={{ color: "var(--red)" }}>
              {data.result.challengerScore} × {data.result.challengedScore}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
