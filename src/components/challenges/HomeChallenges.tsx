import Link from "next/link";
import type { HomeChallenge } from "@/types/api";
import type { SuggestedRival } from "@/types";
import SuggestedChallengeCard from "@/components/home/SuggestedChallengeCard";

function getStatusLabel(status: HomeChallenge["status"]) {
  return ({ pending: "Pendente", accepted: "Ativo", declined: "Recusado", expired: "Expirado", completed: "Encerrado" } satisfies Record<HomeChallenge["status"], string>)[status];
}
function getStatusColor(status: HomeChallenge["status"]) {
  return ({ pending: "var(--red)", accepted: "var(--green)", declined: "var(--text-muted)", expired: "var(--text-muted)", completed: "var(--red)" } satisfies Record<HomeChallenge["status"], string>)[status];
}

export default function HomeChallenges({ challenges, suggestedRivals = [], currentEvent = null }: { challenges: HomeChallenge[]; suggestedRivals?: SuggestedRival[]; currentEvent?: { id: string; name: string } | null }) {
  return <section className="home-reveal" aria-labelledby="home-challenges-heading">
    <div className="mb-3 flex items-center justify-between gap-3"><div className="red-line !mb-0"><h2 id="home-challenges-heading" className="section-title">Desafios</h2></div><Link href="/desafios" className="min-tap px-2 font-condensed text-[10px] font-900 uppercase tracking-[0.14em] text-[var(--red)]">Ver todos →</Link></div>
    <div className="overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
      {challenges.length === 0 && !suggestedRivals.length && <div className="px-4 py-5"><p className="font-condensed text-sm font-900 uppercase text-[var(--text)]">Nenhum desafio ativo</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Convide um rival para o próximo card.</p></div>}
      {challenges.map((challenge) => <Link key={challenge.id} href={`/desafios/${challenge.id}`} className="flex min-h-[70px] items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"><div className="flex min-w-0 items-center gap-3"><span className="shrink-0 border px-2 py-1 font-condensed text-[10px] font-900 uppercase tracking-[0.1em]" style={{ color: getStatusColor(challenge.status), borderColor: getStatusColor(challenge.status) }}>{getStatusLabel(challenge.status)}</span><div className="min-w-0"><p className="truncate font-condensed text-sm font-900 uppercase text-[var(--text)]">{challenge.opponent?.nickname || "Desconhecido"}</p><p className="truncate font-condensed text-[10px] font-700 uppercase tracking-[0.12em] text-[var(--text-muted)]">{challenge.event?.name || "Evento"}{challenge.status === "pending" ? " · Precisa responder" : ""}</p></div></div><span className="shrink-0 font-condensed text-[10px] font-900 uppercase tracking-[0.12em] text-[var(--red)]">Abrir →</span></Link>)}
      <SuggestedChallengeCard rivals={suggestedRivals} event={currentEvent} />
    </div>
  </section>;
}
