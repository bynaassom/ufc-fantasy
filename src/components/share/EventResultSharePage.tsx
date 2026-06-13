"use client";

import Link from "next/link";
import { useRef } from "react";
import { formatEventDate } from "@/lib/utils";
import PublicShareHeader from "@/components/share/PublicShareHeader";
import ShareActions from "@/components/share/ShareActions";

type ShareData = NonNullable<Awaited<ReturnType<typeof import("@/server/services/app").getPublicEventResultShareData>>>;

function fighterName(fighter: any) {
  if (Array.isArray(fighter)) return fighter[0]?.name || "";
  return fighter?.name || "";
}

function resultLabel(fight: any) {
  if (!fight.result_confirmed || !fight.winner_id) return "Aguardando resultado";
  const winner = fight.winner_id === fight.fighter_a_id ? fighterName(fight.fighter_a) : fighterName(fight.fighter_b);
  return `${winner} · ${fight.result_method || "resultado"}${fight.result_round ? ` R${fight.result_round}` : ""}`;
}

function methodLabel(method?: string | null) {
  const labels: Record<string, string> = {
    decision: "Decisão",
    submission: "Finalização",
    knockout: "Nocaute",
  };
  return method ? labels[method] || method : "-";
}

function safeFilenamePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "jogador";
}

export default function EventResultSharePage({ data, shareUrl }: { data: ShareData; shareUrl: string }) {
  const { event, profile, picks, score, rank, status } = data;
  const cardRef = useRef<HTMLDivElement>(null);
  const pickMap = new Map((picks || []).map((pick: any) => [pick.fight_id, pick]));
  const totalPoints = Number(score?.total_points || 0);
  const perfectPicks = Number((score as any)?.perfect_picks ?? (picks.filter((pick: any) => pick.total_points === 3).length || 0));
  const winnersHit = picks.filter((pick: any) => Number(pick.points_winner || 0) > 0).length;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`Veja meu resultado no ${event.name}: ${profile.nickname} fez ${totalPoints} pts no UFC Fantasy ${shareUrl}`)}`;
  const shareCaption = `🏆 ${profile.nickname} scored ${totalPoints}pts at ${event.name}! Play UFC Fantasy at ${shareUrl}`;
  const filename = `ufc-fantasy-result-${event.slug}-${safeFilenamePart(profile.nickname)}.png`;

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <PublicShareHeader />
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div
          ref={cardRef}
          style={{ width: 600, maxWidth: "100%", backgroundColor: "var(--bg)", margin: "0 auto" }}
        >
          <div className="mb-6">
            <p className="font-condensed text-xs font-700 uppercase tracking-widest" style={{ color: "var(--red)" }}>
              UFC Fantasy Share
            </p>
            <h1 className="mt-1 font-condensed text-4xl font-900 uppercase leading-none tracking-wide md:text-6xl" style={{ color: "var(--text)" }}>
              {profile.nickname}
            </h1>
            <p className="mt-2 font-condensed text-sm font-700 uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
              {event.name} · {formatEventDate(event.event_date)}
            </p>
          </div>

          {status === "not_public_yet" ? (
            <div className="p-8 text-center" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>
              <p className="font-condensed text-xl font-900 uppercase tracking-widest" style={{ color: "var(--text)" }}>
                Resultado ainda não público
              </p>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                Os picks desse evento ficam públicos depois do fechamento.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-px md:grid-cols-4" style={{ backgroundColor: "var(--border)" }}>
                {[
                  { label: "Pontos", value: totalPoints },
                  { label: "Ranking do evento", value: rank ? `#${rank}` : "-" },
                  { label: "Vencedores", value: winnersHit },
                  { label: "Cravadas", value: perfectPicks },
                ].map((item) => (
                  <div key={item.label} className="p-5" style={{ backgroundColor: "var(--bg-card)" }}>
                    <p className="font-condensed text-4xl font-900 leading-none" style={{ color: "var(--red)" }}>
                      {item.value}
                    </p>
                    <p className="mt-2 font-condensed text-xs font-700 uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-2">
                {(event.fights || [])
                  .slice()
                  .sort((a: any, b: any) => a.fight_order - b.fight_order)
                  .map((fight: any) => {
                    const pick = pickMap.get(fight.id) as any;
                    const pickedName = pick?.picked_winner_id === fight.fighter_a_id ? fighterName(fight.fighter_a) : pick?.picked_winner_id === fight.fighter_b_id ? fighterName(fight.fighter_b) : "Sem pick";
                    const isPerfect = Number(pick?.total_points || 0) === 3;

                    return (
                      <div
                        key={fight.id}
                        className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center"
                        style={{
                          backgroundColor: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderLeft: `3px solid ${isPerfect ? "#22c55e" : Number(pick?.total_points || 0) > 0 ? "var(--red)" : "var(--border)"}`,
                        }}
                      >
                        <div>
                          <p className="font-condensed text-sm font-900 uppercase tracking-wide" style={{ color: "var(--text)" }}>
                            {fighterName(fight.fighter_a)} vs {fighterName(fight.fighter_b)}
                          </p>
                          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                            Resultado: {resultLabel(fight)}
                          </p>
                          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                            Pick: {pickedName} · {methodLabel(pick?.picked_method)} · R{pick?.picked_round || "-"}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="font-condensed text-2xl font-900" style={{ color: isPerfect ? "#22c55e" : "var(--red)" }}>
                            {Number(pick?.total_points || 0)} pts
                          </p>
                          {isPerfect && (
                            <p className="font-condensed text-[10px] font-900 uppercase tracking-widest" style={{ color: "#22c55e" }}>
                              Cravada
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="mt-8 p-5 text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <p className="font-condensed text-sm font-900 uppercase tracking-widest" style={{ color: "var(--text)" }}>
                  Jogue UFC Fantasy
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {shareUrl}
                </p>
              </div>
            </>
          )}
        </div>

        {status === "public" && (
          <div className="mt-8">
            <ShareActions
              cardRef={cardRef}
              filename={filename}
              shareCaption={shareCaption}
              whatsappTextUrl={whatsappHref}
            />
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <Link href="/register" className="px-5 py-3 text-center font-condensed text-sm font-900 uppercase tracking-widest" style={{ border: "1px solid var(--border)", color: "var(--text)" }}>
            Criar minha conta
          </Link>
        </div>
      </section>
    </main>
  );
}
