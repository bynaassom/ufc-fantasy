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

function safeFilenamePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "jogador";
}

function compactFightLabel(name: string) {
  return name.length > 28 ? `${name.slice(0, 25)}...` : name;
}

export default function EventResultSharePage({ data, shareUrl }: { data: ShareData; shareUrl: string }) {
  const { event, profile, picks, score, rank, status } = data;
  const cardRef = useRef<HTMLDivElement>(null);
  const pickMap = new Map((picks || []).map((pick: any) => [pick.fight_id, pick]));
  const totalPoints = Number(score?.total_points || 0);
  const perfectPicks = Number((score as any)?.perfect_picks ?? (picks.filter((pick: any) => pick.total_points === 3).length || 0));
  const winnersHit = picks.filter((pick: any) => Number(pick.points_winner || 0) > 0).length;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`Veja meu resultado no ${event.name}: ${profile.nickname} fez ${totalPoints} pts no UFC Fantasy ${shareUrl}`)}`;
  const shareCaption = `${profile.nickname} fez ${totalPoints} pontos no ${event.name} pelo UFC Fantasy. Veja o resultado e entre no jogo: ${shareUrl}`;
  const filename = `ufc-fantasy-result-${event.slug}-${safeFilenamePart(profile.nickname)}.png`;
  const sortedFights = (event.fights || [])
    .slice()
    .sort((a: any, b: any) => a.fight_order - b.fight_order);

  return (
    <main className="min-h-[100dvh]" style={{ backgroundColor: "var(--bg)" }}>
      <PublicShareHeader />
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="overflow-x-auto pb-3">
          <div
            ref={cardRef}
            className="mx-auto font-condensed"
            style={{
              width: 540,
              height: 960,
              background: "#0d0d0d",
              color: "#f0f0f0",
              padding: 22,
              boxShadow: "0 28px 70px rgba(0,0,0,0.28)",
            }}
          >
            <div
              style={{
                height: "100%",
                border: "1px solid #2a2a2a",
                padding: 28,
                background: "#1a1a1a",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ width: 40, height: 3, background: "#e8001a" }} />

              <div className="mt-6 flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-900 uppercase tracking-[0.2em]" style={{ color: "#e8001a" }}>UFC Fantasy</p>
                  <p className="mt-1 text-[14px] font-500 uppercase tracking-widest" style={{ color: "#888" }}>{formatEventDate(event.event_date)}</p>
                </div>
                <p className="max-w-[200px] text-right text-[14px] font-700 uppercase tracking-widest leading-tight" style={{ color: "#f0f0f0" }}>{event.name}</p>
              </div>

              {status === "not_public_yet" ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center">
                    <p className="text-[38px] font-900 uppercase leading-none tracking-wide" style={{ color: "#f0f0f0" }}>Resultado<br />privado</p>
                    <p className="mt-5 text-[18px] font-500 uppercase tracking-widest" style={{ color: "#888" }}>
                      Os resultados ficam<br />públicos após o fechamento.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-8 text-center">
                    <p className="text-[24px] font-500 uppercase tracking-[0.18em]" style={{ color: "#888" }}>Resultado</p>
                    <h1 className="mt-1 text-[108px] font-900 uppercase leading-[0.85] tracking-tight" style={{ color: "#e8001a" }}>
                      {totalPoints}<span className="ml-2 text-[42px] font-700" style={{ color: "#888" }}>pts</span>
                    </h1>
                    <p className="mt-2 text-[20px] font-700 uppercase tracking-widest" style={{ color: "#888" }}>
                      {event.name} {rank ? `· #${rank} no evento` : ""}
                    </p>
                  </div>

                  <div className="mt-8 grid grid-cols-3" style={{ border: "1px solid #2a2a2a", background: "#141414" }}>
                    {[
                      { label: "Vencedores", value: winnersHit },
                      { label: "Cravadas", value: perfectPicks },
                      { label: "Ranking", value: rank ? `#${rank}` : "-" },
                    ].map((item, index) => (
                      <div key={item.label} className="px-3 py-4 text-center" style={{ borderLeft: index ? "1px solid #2a2a2a" : "none" }}>
                        <p className="text-[40px] font-900 leading-none" style={{ color: index === 1 ? "#e8001a" : "#f0f0f0" }}>{item.value}</p>
                        <p className="mt-1 text-[12px] font-500 uppercase tracking-[0.18em]" style={{ color: "#888" }}>{item.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex-1 space-y-[6px] overflow-hidden">
                    {sortedFights.map((fight: any, index: number) => {
                    const pick = pickMap.get(fight.id) as any;
                    const pickedName = pick?.picked_winner_id === fight.fighter_a_id ? fighterName(fight.fighter_a) : pick?.picked_winner_id === fight.fighter_b_id ? fighterName(fight.fighter_b) : "Sem pick";
                    const isPerfect = Number(pick?.total_points || 0) === 3;

                    return (
                      <div
                        key={fight.id}
                        className="flex items-center justify-between gap-3"
                        style={{
                          height: 32,
                          background: "#222",
                          borderLeft: isPerfect ? "3px solid #e8001a" : "3px solid transparent",
                          paddingLeft: isPerfect ? 10 : 13,
                          paddingRight: 12,
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-5 text-right text-[14px] font-700" style={{ color: "#666" }}>{index + 1}</span>
                          <span className="truncate text-[15px] font-700" style={{ color: isPerfect ? "#f0f0f0" : "#888" }}>{compactFightLabel(pickedName)}</span>
                        </div>
                        <p className="flex-shrink-0 text-[17px] font-900" style={{ color: isPerfect ? "#e8001a" : "#666" }}>
                          {Number(pick?.total_points || 0)} pts
                        </p>
                      </div>
                    );
                  })}
                  </div>

                  <div className="mt-6" style={{ borderTop: "1px solid #2a2a2a" }} />
                  <p className="mt-5 text-center text-[16px] font-500 tracking-[0.12em]" style={{ color: "#888" }}>
                    ufc-fantasy.vercel.app · monte o seu
                  </p>
                </>
              )}
            </div>
          </div>
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
