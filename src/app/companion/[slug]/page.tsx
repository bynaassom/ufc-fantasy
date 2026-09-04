import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrandLogo from "@/components/ui/BrandLogo";
import CompanionFightCard from "@/components/companion/CompanionFightCard";
import {
  EventAlertButton,
  EventAlertProvider,
} from "@/components/event/EventAlertControls";
import { shouldOptimizeRemoteImage } from "@/lib/image-optimization";
import { formatEventDate } from "@/lib/utils";
import { getCompanionEventPageData } from "@/server/services/app";

type Params = { params: Promise<{ slug: string }> };

export const revalidate = 30;

export async function generateMetadata(props: Params): Promise<Metadata> {
  const { slug } = await props.params;
  const event = await getCompanionEventPageData(slug);
  return {
    title: event ? `Companion | ${event.name}` : "Modo Companion | UFC Fantasy",
    description: "Acompanhe o card com alertas por evento ou luta, sem cadastro e sem spoilers obrigatórios.",
  };
}

export default async function CompanionEventPage(props: Params) {
  const { slug } = await props.params;
  const event = await getCompanionEventPageData(slug);
  if (!event) notFound();

  const preliminaryFights = event.fights
    .filter((fight) => fight.card_type === "preliminary")
    .sort((a, b) => a.fight_order - b.fight_order);
  const mainFights = event.fights
    .filter((fight) => fight.card_type === "main")
    .sort((a, b) => a.fight_order - b.fight_order);
  const orderedFights = [...preliminaryFights, ...mainFights];

  return (
    <EventAlertProvider
      eventSlug={slug}
      eventName={event.name}
      disabled={event.status === "completed"}
      publicMode
    >
      <main className="min-h-[100dvh] bg-[var(--bg)] text-[var(--text)]">
        <header className="border-b border-[var(--border)]">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link href="/" aria-label="Voltar para a página inicial">
              <BrandLogo priority />
            </Link>
            <div className="flex items-center gap-2">
              <span className="hidden font-condensed text-[9px] font-800 uppercase tracking-[0.2em] text-[var(--text-muted)] sm:inline">
                Sem cadastro
              </span>
              <Link href="/register" className="min-tap border border-[var(--border)] px-4 font-condensed text-[10px] font-900 uppercase tracking-widest text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text)]">
                Jogar Fantasy
              </Link>
            </div>
          </div>
        </header>

        <section className="relative min-h-[330px] overflow-hidden border-b border-[var(--border)] sm:min-h-[410px]">
          {event.banner_image_url ? (
            <Image
              src={event.banner_image_url}
              alt={event.name}
              fill
              priority
              sizes="100vw"
              unoptimized={!shouldOptimizeRemoteImage(event.banner_image_url)}
              className="object-cover"
              style={{ objectPosition: event.banner_object_position || "center" }}
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--bg-secondary)]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,8,8,0.98),rgba(8,8,8,0.32)_70%,rgba(8,8,8,0.2))]" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-7 text-white sm:px-6 sm:pb-9">
            <p className="mb-3 font-condensed text-[10px] font-900 uppercase tracking-[0.25em] text-[var(--red)]">
              Modo Companion · Card ao vivo
            </p>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="max-w-3xl font-condensed text-4xl font-900 uppercase leading-[0.92] sm:text-6xl">
                  {event.name}
                </h1>
                <p className="mt-3 font-condensed text-xs font-700 uppercase tracking-wider text-white/65">
                  {formatEventDate(event.event_date)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </div>
              <EventAlertButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-7 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-5">
            <div>
              <p className="font-condensed text-[9px] font-900 uppercase tracking-[0.24em] text-[var(--red)]">
                Escolha por luta
              </p>
              <h2 className="mt-2 font-condensed text-3xl font-900 uppercase leading-none">
                Card completo
              </h2>
            </div>
            <p className="max-w-[18rem] text-left text-[11px] leading-relaxed text-[var(--text-muted)] sm:max-w-[15rem] sm:text-right">
              Toque no sino para configurar. Resultados vêm desligados por padrão.
            </p>
          </div>

          <div className="border border-[var(--border)] bg-[var(--bg-card)]">
            {orderedFights.map((fight, index) => (
              <CompanionFightCard key={fight.id} fight={fight} number={index + 1} />
            ))}
            {!orderedFights.length && (
              <p className="p-8 text-center text-sm text-[var(--text-muted)]">
                O card ainda não foi publicado.
              </p>
            )}
          </div>

          <div className="mt-6 border-l-2 border-[var(--red)] bg-[var(--bg-secondary)] px-4 py-3">
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              Sua seleção fica neste navegador. Não pedimos nome ou e-mail. Para
              receber os avisos, permita as notificações quando o navegador solicitar.
            </p>
          </div>
        </section>
      </main>
    </EventAlertProvider>
  );
}
