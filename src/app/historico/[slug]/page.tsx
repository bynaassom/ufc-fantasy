import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import FightCard from "@/components/event/FightCard";
import { formatEventDate } from "@/lib/utils";
import type { FightWithFighters, Pick } from "@/types";
import { getHistoryEventPageData } from "@/server/services/app";

interface HistoricoEventoPageProps {
  params: { slug: string };
}

export default async function HistoricoEventoPage({
  params,
}: HistoricoEventoPageProps) {
  const { profile, event, picks, score } = await getHistoryEventPageData(
    params.slug,
  );
  if (!event) {
    notFound();
  }

  const fights: FightWithFighters[] = [...(event.fights || [])].sort(
    (left, right) => {
      if (left.card_type !== right.card_type) {
        return left.card_type === "main" ? -1 : 1;
      }
      return left.fight_order - right.fight_order;
    },
  );

  const mainCard = fights.filter((fight) => fight.card_type === "main");
  const prelims = fights.filter((fight) => fight.card_type === "preliminary");
  const picksMap = Object.fromEntries(
    (picks || []).map((pick: Pick) => [pick.fight_id, pick]),
  ) as Record<string, Pick | undefined>;
  const shareHref = `/share/event/${encodeURIComponent(event.slug)}/${encodeURIComponent(profile.nickname)}`;

  return (
    <div
      className="min-h-[100dvh] md:pb-0"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/historico"
            className="flex items-center gap-2 font-condensed font-600 text-xs uppercase tracking-widest mb-4 transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Histórico
          </Link>

          <h1
            className="font-condensed font-900 text-2xl uppercase tracking-wide"
            style={{ color: "var(--text)" }}
          >
            {event.name}
          </h1>
          <p
            className="font-condensed font-600 text-xs uppercase tracking-widest mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            {formatEventDate(event.event_date)}
            {event.location && ` · ${event.location}`}
          </p>
        </div>

        {score && (
          <div
            className="mb-8 p-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--red)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Sua pontuação
                </p>
                <p
                  className="font-condensed font-900 text-3xl leading-none mt-1"
                  style={{ color: "var(--red)" }}
                >
                  {score.total_points}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  Cravadas perfeitas
                </p>
                <p
                  className="font-condensed font-900 text-xl leading-none mt-1"
                  style={{ color: "var(--text)" }}
                >
                  {score.perfect_picks || 0}
                </p>
              </div>
            </div>
            <Link
              href={shareHref}
              className="block w-full px-4 py-3 text-center font-condensed text-xs font-900 uppercase tracking-widest text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--red)" }}
            >
              Compartilhar resultado
            </Link>
            <Link
              href={`/recap/${encodeURIComponent(event.slug)}`}
              className="mt-2 block w-full px-4 py-3 text-center font-condensed text-xs font-900 uppercase tracking-widest transition-opacity hover:opacity-80"
              style={{ color: "var(--text)", border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
            >
              Recap do evento
            </Link>
          </div>
        )}

        {mainCard.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
              <h2
                className="text-sm font-black uppercase tracking-widest px-3 py-1"
                style={{ backgroundColor: "var(--red)", color: "white" }}
              >
                Card Principal
              </h2>
              <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
            </div>
            <div className="space-y-4">
              {mainCard.map((fight) => (
                <FightCard
                  key={fight.id}
                  fight={fight}
                  existingPick={picksMap[fight.id]}
                  locked={true}
                />
              ))}
            </div>
          </section>
        )}

        {prelims.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
              <h2
                className="text-sm font-black uppercase tracking-widest px-3 py-1"
                style={{
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                Card Preliminar
              </h2>
              <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
            </div>
            <div className="space-y-4">
              {prelims.map((fight) => (
                <FightCard
                  key={fight.id}
                  fight={fight}
                  existingPick={picksMap[fight.id]}
                  locked={true}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
