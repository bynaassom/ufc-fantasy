import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import UpcomingEventCard from "@/components/home/UpcomingEventCard";
import { getEventsIndexPageData } from "@/server/services/app";

export const dynamic = "force-dynamic";

export default async function CurrentEventPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [{ view }, data] = await Promise.all([
    searchParams,
    getEventsIndexPageData(),
  ]);
  const selectedView = Array.isArray(view) ? view[0] : view;

  if (selectedView !== "all") {
    redirect(data.currentEvent ? `/event/${data.currentEvent.slug}` : "/home");
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)]">
      <Navbar profile={data.profile} />
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 md:px-6 md:pb-12 md:pt-10">
        <header className="mb-10 border-b border-[var(--border)] pb-6">
          <p className="font-condensed text-[10px] font-900 uppercase tracking-[0.2em] text-[var(--red)]">
            Calendário UFC Fantasy
          </p>
          <h1 className="mt-2 font-condensed text-[clamp(2.5rem,8vw,5.5rem)] font-900 uppercase leading-[0.84] tracking-tight text-[var(--text)]">
            Eventos
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Acesse o evento atual ou se antecipe aos próximos cards divulgados.
          </p>
        </header>

        {data.currentEvent && (
          <section aria-labelledby="current-event-list-heading">
            <div className="red-line">
              <h2 id="current-event-list-heading" className="section-title">
                Evento atual
              </h2>
            </div>
            <div className="max-w-[370px]">
              <UpcomingEventCard event={data.currentEvent} />
            </div>
          </section>
        )}

        {data.upcomingEvents.length > 0 && (
          <section
            aria-labelledby="upcoming-event-list-heading"
            className={data.currentEvent ? "mt-12 md:mt-16" : undefined}
          >
            <div className="red-line">
              <h2 id="upcoming-event-list-heading" className="section-title">
                Próximos eventos
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.upcomingEvents.map((event) => (
                <UpcomingEventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {!data.currentEvent && data.upcomingEvents.length === 0 && (
          <section className="border border-[var(--border)] bg-[var(--bg-card)] px-5 py-14 text-center">
            <h2 className="font-condensed text-xl font-900 uppercase text-[var(--text)]">
              Nenhum evento divulgado
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              O calendário será atualizado assim que novos cards forem publicados.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
