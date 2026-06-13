import Link from "next/link";
import { formatEventDate } from "@/lib/utils";
import PublicShareHeader from "@/components/share/PublicShareHeader";

type ShareData = NonNullable<Awaited<ReturnType<typeof import("@/server/services/app").getPublicEventPickShareData>>>;

function fighterName(fighter: any) {
  if (Array.isArray(fighter)) return fighter[0]?.name || "";
  return fighter?.name || "";
}

function methodLabel(method?: string | null) {
  const labels: Record<string, string> = {
    decision: "Decisão",
    submission: "Finalização",
    knockout: "Nocaute",
  };
  return method ? labels[method] || method : "-";
}

export default function EventPickSharePage({ data, shareUrl }: { data: ShareData; shareUrl: string }) {
  const { event, profile, picks, status } = data;
  const pickMap = new Map((picks || []).map((pick: any) => [pick.fight_id, pick]));
  const totalPicks = picks.length;
  const lockedPicks = picks.filter((p: any) => p.is_confirmed).length;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`Veja meus picks para o ${event.name}: ${profile.nickname} no UFC Fantasy ${shareUrl}`)}`;

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <PublicShareHeader />
      <section className="mx-auto max-w-5xl px-4 py-8">
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
              Picks ainda não públicos
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Os picks desse evento ficam públicos depois do fechamento.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-px md:grid-cols-3" style={{ backgroundColor: "var(--border)" }}>
              {[
                { label: "Total de picks", value: totalPicks },
                { label: "Confirmados", value: lockedPicks },
                { label: "Lutas no card", value: event.fights?.length || 0 },
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
                  const hasPick = !!pick;

                  return (
                    <div
                      key={fight.id}
                      className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderLeft: `3px solid ${hasPick ? "var(--red)" : "var(--border)"}`,
                      }}
                    >
                      <div>
                        <p className="font-condensed text-sm font-900 uppercase tracking-wide" style={{ color: "var(--text)" }}>
                          {fighterName(fight.fighter_a)} vs {fighterName(fight.fighter_b)}
                        </p>
                        {hasPick ? (
                          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                            Pick: {pickedName} · {methodLabel(pick.picked_method)} · R{pick.picked_round || "-"}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                            Sem pick
                          </p>
                        )}
                      </div>
                      {hasPick && (
                        <div className="text-left md:text-right">
                          <p className="font-condensed text-xs font-700 uppercase tracking-widest" style={{ color: pick.is_confirmed ? "#22c55e" : "var(--text-muted)" }}>
                            {pick.is_confirmed ? "Confirmado" : "Rascunho"}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href={whatsappHref} className="px-5 py-3 text-center font-condensed text-sm font-900 uppercase tracking-widest text-white" style={{ backgroundColor: "var(--red)" }}>
            Compartilhar no WhatsApp
          </a>
          <Link href="/register" className="px-5 py-3 text-center font-condensed text-sm font-900 uppercase tracking-widest" style={{ border: "1px solid var(--border)", color: "var(--text)" }}>
            Criar minha conta
          </Link>
        </div>
      </section>
    </main>
  );
}
