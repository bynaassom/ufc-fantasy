import Link from "next/link";
import type { HomeChallenge } from "@/types/api";

function getStatusLabel(status: HomeChallenge["status"]) {
  const labels: Record<HomeChallenge["status"], string> = {
    pending: "Pendente",
    accepted: "Ativo",
    declined: "Recusado",
    expired: "Expirado",
    completed: "Encerrado",
  };
  return labels[status];
}

function getStatusColor(status: HomeChallenge["status"]) {
  const colors: Record<HomeChallenge["status"], string> = {
    pending: "var(--red)",
    accepted: "#22c55e",
    declined: "var(--text-muted)",
    expired: "var(--text-muted)",
    completed: "var(--red)",
  };
  return colors[status];
}

export default function HomeChallenges({
  challenges,
}: {
  challenges: HomeChallenge[];
}) {
  if (!challenges.length) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="red-line flex-1">
          <span className="section-title">Desafios</span>
        </div>
        <Link
          href="/desafios"
          className="font-condensed font-700 text-xs uppercase tracking-widest ml-4 transition-opacity hover:opacity-70"
          style={{ color: "var(--red)" }}
        >
          VER TODOS →
        </Link>
      </div>
      <div style={{ border: "1px solid var(--border)" }}>
        {challenges.map((challenge, index) => {
          const isIncoming =
            challenge.status === "pending";
          const opponent = challenge.opponent;

          return (
            <Link
              key={challenge.id}
              href={`/desafios/${challenge.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover-bg-elevated"
              style={{
                borderBottom:
                  index < challenges.length - 1
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="font-condensed font-900 text-[10px] uppercase tracking-widest px-2 py-1 flex-shrink-0"
                  style={{
                    color: getStatusColor(challenge.status),
                    border: `1px solid ${getStatusColor(challenge.status)}`,
                  }}
                >
                  {getStatusLabel(challenge.status)}
                </span>
                <div className="min-w-0">
                  <p
                    className="font-condensed font-900 text-sm uppercase tracking-wide truncate"
                    style={{ color: "var(--text)" }}
                  >
                    {opponent ? opponent.nickname : "Desconhecido"}
                  </p>
                  <p
                    className="font-condensed font-600 text-xs uppercase tracking-widest mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {challenge.event?.name || "Evento"}
                    {isIncoming && " · Precisa responder"}
                  </p>
                </div>
              </div>
              <span
                className="font-condensed font-900 text-xs uppercase tracking-widest flex-shrink-0"
                style={{ color: "var(--red)" }}
              >
                ABRIR
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
