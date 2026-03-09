import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import Image from "next/image";
import { Event } from "@/types";
import { formatEventDate, isPicksLocked, timeUntilEvent } from "@/lib/utils";

export const revalidate = 60; // revalida a cada 60s

export default async function HomePage() {
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
  if (profile?.is_banned) redirect("/login");

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true })
    .limit(8);

  const currentEvent = events?.find(
    (e: Event) => e.status === "live" || e.status === "upcoming",
  );
  const upcomingEvents =
    events?.filter((e: Event) => e.id !== currentEvent?.id) || [];

  return (
    <div
      className="min-h-screen pb-20 md:pb-0"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Navbar profile={profile} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div
          className="mb-8 pb-6"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <p
            className="font-condensed font-700 text-xs uppercase tracking-widest mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Bem-vindo de volta
          </p>
          <h1
            className="font-condensed font-900 text-3xl uppercase tracking-wide"
            style={{ color: "var(--text)" }}
          >
            <span style={{ color: "var(--red)" }}>{profile?.nickname}</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {profile?.total_points} pontos acumulados
          </p>
        </div>

        {/* Current Event */}
        {currentEvent ? (
          <section className="mb-10">
            <div className="red-line">
              <span className="section-title">
                {currentEvent.status === "live" ? "AO VIVO" : "EVENTO ATUAL"}
              </span>
              {currentEvent.status === "live" && (
                <span
                  className="ml-2 inline-flex items-center gap-1.5 font-condensed font-700 text-xs uppercase tracking-widest px-2 py-0.5"
                  style={{ backgroundColor: "var(--red)", color: "white" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              )}
            </div>

            <Link href={`/event/${currentEvent.slug}`} className="block group">
              {/* Banner */}
              <div
                className="relative w-full overflow-hidden"
                style={{
                  aspectRatio: "16/6",
                  backgroundColor: "var(--bg-card)",
                }}
              >
                {currentEvent.banner_image_url ? (
                  <>
                    <Image
                      src={currentEvent.banner_image_url}
                      alt={currentEvent.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
                      }}
                    />
                  </>
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)",
                    }}
                  >
                    <div className="text-center">
                      <p
                        className="font-condensed font-900 text-xs uppercase tracking-ultra mb-2"
                        style={{ color: "var(--red)" }}
                      >
                        UFC
                      </p>
                      <p
                        className="font-condensed font-900 uppercase"
                        style={{
                          fontSize: "clamp(1.5rem, 4vw, 3rem)",
                          color: "var(--text)",
                          letterSpacing: "0.03em",
                        }}
                      >
                        {currentEvent.name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Overlay info */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p
                    className="font-condensed font-900 uppercase text-white"
                    style={{
                      fontSize: "clamp(1.25rem, 3.5vw, 2.5rem)",
                      letterSpacing: "0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {currentEvent.name}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    {currentEvent.location && (
                      <span className="font-condensed font-600 text-xs uppercase tracking-widest text-white/60">
                        {currentEvent.location}
                      </span>
                    )}
                    <span className="font-condensed font-600 text-xs uppercase tracking-widest text-white/60">
                      {formatEventDate(currentEvent.event_date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event footer bar */}
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderLeft: "3px solid var(--red)",
                }}
              >
                <p
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{
                    color: isPicksLocked(currentEvent.picks_lock_at)
                      ? "var(--text-muted)"
                      : "var(--text-secondary)",
                  }}
                >
                  {isPicksLocked(currentEvent.picks_lock_at)
                    ? "PICKS ENCERRADOS"
                    : `PICKS FECHAM ${timeUntilEvent(currentEvent.picks_lock_at).toUpperCase()}`}
                </p>
                <span
                  className="flex items-center gap-2 font-condensed font-900 text-xs uppercase tracking-widest px-4 py-2 text-white"
                  style={{ backgroundColor: "var(--red)" }}
                >
                  FAZER PICKS
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          </section>
        ) : (
          <div
            className="mb-10 py-16 text-center"
            style={{ border: "1px solid var(--border)" }}
          >
            <p
              className="font-condensed font-900 text-xl uppercase tracking-wide"
              style={{ color: "var(--text)" }}
            >
              Nenhum evento ativo
            </p>
            <p
              className="text-sm mt-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Aguarde a divulgação do próximo evento
            </p>
          </div>
        )}

        {/* Upcoming */}
        {upcomingEvents.length > 0 && (
          <section>
            <div className="red-line mb-4">
              <span className="section-title">Próximos Eventos</span>
            </div>
            <div
              className="space-y-0"
              style={{ border: "1px solid var(--border)" }}
            >
              {upcomingEvents.map((event: Event, i: number) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between px-5 py-4"
                  style={{
                    borderBottom:
                      i < upcomingEvents.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    opacity: 0.5,
                    cursor: "not-allowed",
                  }}
                >
                  <div>
                    <p
                      className="font-condensed font-900 text-sm uppercase tracking-wide"
                      style={{ color: "var(--text)" }}
                    >
                      {event.name}
                    </p>
                    <p
                      className="font-condensed font-600 text-xs uppercase tracking-widest mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {formatEventDate(event.event_date)}
                      {event.location && ` · ${event.location}`}
                    </p>
                  </div>
                  <span
                    className="font-condensed font-700 text-xs uppercase tracking-widest px-3 py-1"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    EM BREVE
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
