import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { Profile } from "@/types";

export const revalidate = 3600; // cache longo — invalidado pelo revalidatePath ao inserir resultado

export default async function RankingPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const tab = searchParams.tab === "evento" ? "evento" : "geral";

  // Ranking geral
  const { data: globalRanking } = await supabase
    .from("profiles")
    .select("id, nickname, first_name, last_name, total_points")
    .eq("is_banned", false)
    .order("total_points", { ascending: false })
    .limit(100);

  // Evento atual (upcoming ou live)
  const { data: currentEvent } = await supabase
    .from("events")
    .select("id, name")
    .in("status", ["upcoming", "live"])
    .order("event_date", { ascending: true })
    .limit(1)
    .single();

  // Ranking do evento atual
  let eventRanking: any[] = [];
  if (currentEvent) {
    const { data } = await supabase
      .from("event_scores")
      .select(
        "user_id, total_points, profile:profiles(id, nickname, first_name, last_name, is_banned)",
      )
      .eq("event_id", currentEvent.id)
      .order("total_points", { ascending: false })
      .limit(100);
    eventRanking = (data || []).filter(
      (r: any) => r.profile && !r.profile.is_banned,
    );
  }

  const geralList = (globalRanking || []).map((p: any, i: number) => ({
    rank: i + 1,
    nickname: p.nickname,
    first_name: p.first_name,
    last_name: p.last_name,
    points: p.total_points,
    userId: p.id,
  }));

  const eventoList = eventRanking.map((r: any, i: number) => ({
    rank: i + 1,
    nickname: r.profile.nickname,
    first_name: r.profile.first_name,
    last_name: r.profile.last_name,
    points: r.total_points,
    userId: r.user_id,
  }));

  const displayRanking = tab === "evento" ? eventoList : geralList;
  const myRank = displayRanking.find((r) => r.userId === user.id);

  return (
    <div
      className="min-h-screen pb-24 md:pb-0"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Navbar profile={profile} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="red-line">
            <span className="section-title" style={{ fontSize: "1.75rem" }}>
              RANKING
            </span>
          </div>
        </div>

        {/* Toggle — estilo igual ao da imagem (Card Principal / Preliminares) */}
        <div
          className="flex mb-6"
          style={{ border: "1px solid var(--border)" }}
        >
          <a
            href="/ranking?tab=geral"
            className="flex-1 py-3 text-center font-condensed font-900 text-xs uppercase tracking-widest transition-all"
            style={{
              backgroundColor:
                tab === "geral" ? "var(--red)" : "var(--bg-card)",
              color: tab === "geral" ? "white" : "var(--text-muted)",
              borderRight: "1px solid var(--border)",
            }}
          >
            GERAL
          </a>
          <a
            href="/ranking?tab=evento"
            className="flex-1 py-3 text-center font-condensed font-900 text-xs uppercase tracking-widest transition-all"
            style={{
              backgroundColor:
                tab === "evento" ? "var(--red)" : "var(--bg-card)",
              color: tab === "evento" ? "white" : "var(--text-muted)",
            }}
          >
            {currentEvent?.name ?? "EVENTO ATUAL"}
          </a>
        </div>

        {/* Minha posição */}
        {myRank && (
          <div
            className="mb-5 flex items-center gap-4 px-5 py-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--red)",
            }}
          >
            <span
              className="font-condensed font-900 text-3xl"
              style={{ color: "var(--red)" }}
            >
              #{myRank.rank}
            </span>
            <div className="flex-1">
              <p
                className="font-condensed font-900 text-base uppercase tracking-wide"
                style={{ color: "var(--red)" }}
              >
                {myRank.nickname ||
                  `${myRank.first_name} ${myRank.last_name}`.trim()}{" "}
                <span
                  className="text-xs font-700"
                  style={{ color: "var(--text-muted)" }}
                >
                  (você)
                </span>
              </p>
              {myRank.nickname && (
                <p
                  className="font-condensed font-600 text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {myRank.first_name} {myRank.last_name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p
                className="font-condensed font-900 text-2xl"
                style={{ color: "var(--red)" }}
              >
                {myRank.points}
              </p>
              <p
                className="font-condensed font-600 text-xs uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                pts
              </p>
            </div>
          </div>
        )}

        {/* Aviso se aba evento sem dados */}
        {tab === "evento" && eventoList.length === 0 && (
          <div
            className="py-12 text-center"
            style={{ border: "1px solid var(--border)" }}
          >
            <p
              className="font-condensed font-700 uppercase tracking-widest text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Ainda sem picks confirmados neste evento
            </p>
          </div>
        )}

        {/* Tabela */}
        {displayRanking.length > 0 && (
          <>
            <div
              className="grid grid-cols-12 px-4 py-2"
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderBottom: "2px solid var(--red)",
              }}
            >
              <div className="col-span-1">
                <span
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  #
                </span>
              </div>
              <div className="col-span-9">
                <span
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  Jogador
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  Pts
                </span>
              </div>
            </div>

            <div
              style={{ border: "1px solid var(--border)", borderTop: "none" }}
            >
              {displayRanking.map((entry, index) => {
                const isMe = entry.userId === user.id;
                const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
                return (
                  <div
                    key={entry.userId}
                    className="grid grid-cols-12 px-4 py-3.5 items-center"
                    style={{
                      backgroundColor: isMe
                        ? "rgba(232,0,26,0.04)"
                        : "transparent",
                      borderBottom:
                        index < displayRanking.length - 1
                          ? "1px solid var(--border-light)"
                          : "none",
                      borderLeft: isMe
                        ? "3px solid var(--red)"
                        : "3px solid transparent",
                    }}
                  >
                    <div className="col-span-1">
                      {entry.rank <= 3 ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={medalColors[entry.rank - 1]}
                          stroke="none"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ) : (
                        <span
                          className="font-condensed font-700 text-sm"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {entry.rank}
                        </span>
                      )}
                    </div>
                    <div className="col-span-9 flex items-center gap-3">
                      <div
                        className="w-7 h-7 flex items-center justify-center font-condensed font-900 text-xs flex-shrink-0"
                        style={{
                          backgroundColor: isMe
                            ? "var(--red)"
                            : "var(--bg-elevated)",
                          color: isMe ? "white" : "var(--text-secondary)",
                        }}
                      >
                        {(entry.nickname ||
                          entry.first_name ||
                          "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p
                          className="font-condensed font-900 text-sm uppercase tracking-wide leading-tight"
                          style={{ color: isMe ? "var(--red)" : "var(--text)" }}
                        >
                          {entry.nickname ||
                            `${entry.first_name} ${entry.last_name}`.trim()}
                        </p>
                        {entry.nickname && (
                          <p
                            className="font-condensed font-600 text-xs uppercase tracking-widest"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {entry.first_name} {entry.last_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <span
                        className="font-condensed font-900 text-lg"
                        style={{
                          color: entry.rank <= 3 ? "var(--red)" : "var(--text)",
                        }}
                      >
                        {entry.points}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
