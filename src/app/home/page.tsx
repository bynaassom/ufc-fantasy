import Link from "next/link";
import { Suspense } from "react";
import Navbar from "@/components/layout/Navbar";
import HomeWithTour from "@/components/onboarding/HomeWithTour";
import HomeChallenges from "@/components/challenges/HomeChallenges";
import HomeSummary from "@/components/home/HomeSummary";
import CurrentEventHero from "@/components/home/CurrentEventHero";
import MainEventComparison from "@/components/home/MainEventComparison";
import HorizontalEventRail from "@/components/home/HorizontalEventRail";
import UpcomingEventCard from "@/components/home/UpcomingEventCard";
import PreviousEventCard from "@/components/home/PreviousEventCard";
import BonusEventPrompt from "@/components/home/BonusEventPrompt";
import { getHomePageData } from "@/server/services/app";

export const revalidate = 60;

function RailHeading({ title, href }: { title: string; href: string }) {
  return <div className="mb-3 flex items-center justify-between gap-3"><div className="red-line !mb-0"><h2 className="section-title">{title}</h2></div><Link href={href} className="min-tap px-2 font-condensed text-[10px] font-900 uppercase tracking-[0.14em] text-[var(--red)]">Ver todos →</Link></div>;
}

async function HomeMainEvent({ mainEvent }: { mainEvent: Awaited<ReturnType<typeof getHomePageData>>["mainEvent"] }) {
  return <MainEventComparison mainEvent={await mainEvent} />;
}

async function HomeChallengeSection({ data }: { data: Awaited<ReturnType<typeof getHomePageData>> }) {
  const [challenges, suggestedRivals] = await Promise.all([data.activeChallenges, data.suggestedRivals]);
  return <HomeChallenges challenges={challenges} suggestedRivals={suggestedRivals} currentEvent={data.currentEvent ? { id: data.currentEvent.id, name: data.currentEvent.name } : null} />;
}

async function HomePreviousEvents({ previousEvents }: { previousEvents: Awaited<ReturnType<typeof getHomePageData>>["previousEvents"] }) {
  const events = await previousEvents;
  if (events.length === 0) return null;
  return <section className="home-reveal" aria-label="Eventos anteriores"><RailHeading title="Eventos anteriores" href="/historico" /><HorizontalEventRail label="Eventos anteriores">{events.map(({ event, performance }) => <PreviousEventCard key={event.id} event={event} performance={performance} />)}</HorizontalEventRail></section>;
}

export default async function HomePage() {
  const data = await getHomePageData();
  return <HomeWithTour show={!data.profile.onboarding_completed}>
    <div className="min-h-[100dvh] bg-[var(--bg)]">
      <Navbar profile={data.profile} />
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-3 md:px-6 md:pb-12 md:pt-5">
        <HomeSummary profile={data.profile} />
        <div className="mt-5 space-y-11 md:mt-7 md:space-y-16">
          <div className="space-y-4">
            {data.currentEvent ? <CurrentEventHero event={data.currentEvent} progress={data.currentEventPickProgress} /> : <section className="border border-[var(--border)] bg-[var(--bg-card)] px-5 py-12 text-center"><h2 className="font-condensed text-xl font-900 uppercase text-[var(--text)]">Nenhum evento principal ativo</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Aguarde a divulgação do próximo card principal.</p></section>}
            <BonusEventPrompt events={data.bonusEvents} />
          </div>
          <Suspense fallback={<div className="h-72 animate-pulse border border-[var(--border)] bg-[var(--bg-card)]" aria-label="Carregando luta principal" />}>
            <HomeMainEvent mainEvent={data.mainEvent} />
          </Suspense>
          <Suspense fallback={<section className="h-32 animate-pulse border border-[var(--border)] bg-[var(--bg-card)]" aria-label="Carregando desafios" />}>
            <HomeChallengeSection data={data} />
          </Suspense>
          {data.upcomingEvents.length > 0 && <section className="home-reveal" aria-label="Próximos eventos"><RailHeading title="Próximos eventos" href="/event?view=all" /><HorizontalEventRail label="Próximos eventos">{data.upcomingEvents.map((event) => <UpcomingEventCard key={event.id} event={event} />)}</HorizontalEventRail></section>}
          {data.hasPreviousEvents && <Suspense fallback={<section className="h-40 animate-pulse border border-[var(--border)] bg-[var(--bg-card)]" aria-label="Carregando eventos anteriores" />}>
            <HomePreviousEvents previousEvents={data.previousEvents} />
          </Suspense>}
        </div>
      </main>
    </div>
  </HomeWithTour>;
}
