import Image from "next/image";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { formatEventDate } from "@/lib/utils";
import { getLandingPageData } from "@/server/services/app";

export const dynamic = "force-dynamic";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3a4 4 0 0 0-4 4v2.5L6.4 12.7A2 2 0 0 0 8.2 15.6h7.6a2 2 0 0 0 1.8-2.9L16 9.5V7a4 4 0 0 0-4-4Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export default async function LandingPage() {
  const { currentEvent, momentumStats } = await getLandingPageData();
  const bannerUrl = currentEvent?.banner_image_url || null;
  const stats = [
    { label: "jogadores no card", value: momentumStats.picks.usersWithConfirmedPicks },
    { label: "desafios ativos", value: momentumStats.challenges.totalActive },
    { label: "ligas criadas", value: momentumStats.leagues.totalGroups },
    { label: "cravadas", value: momentumStats.scoring.perfectPicks },
  ].filter((item) => item.value > 0);
  const statsGridClass =
    stats.length >= 4
      ? "md:grid-cols-4"
      : stats.length === 3
        ? "md:grid-cols-3"
        : stats.length === 2
          ? "md:grid-cols-2"
          : "md:grid-cols-1";

  return (
    <main className="min-h-[100dvh] bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <BrandLogo priority />
          <nav className="flex items-center gap-1 sm:gap-3" aria-label="Acesso">
            <Link href="/login" className="min-tap px-3 font-condensed text-xs font-700 uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text)] sm:px-5">
              Entrar
            </Link>
            <Link href="/register" className="min-tap bg-[var(--red)] px-4 font-condensed text-xs font-900 uppercase tracking-widest text-white transition-opacity hover:opacity-90 sm:px-5">
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-[var(--border)]">
        <div className="mx-auto grid min-h-[650px] max-w-6xl lg:grid-cols-[1.02fr_0.98fr]">
          <div className="flex flex-col justify-center px-5 py-16 sm:px-6 lg:py-24 lg:pr-14">
            <p className="mb-5 flex items-center gap-3 font-condensed text-[11px] font-900 uppercase tracking-[0.28em] text-[var(--red)]">
              <span className="h-px w-9 bg-[var(--red)]" />
              Fantasy + Companion ao vivo
            </p>
            <h1 className="max-w-3xl font-condensed text-[clamp(3.9rem,10vw,7.2rem)] font-900 uppercase leading-[0.82] tracking-[-0.045em]">
              Jogue o card.
              <br />
              <span className="text-[var(--red)]">Ou só não</span>
              <br />
              perca nada.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
              Faça seus picks, dispute com amigos ou acompanhe cada luta com
              alertas do jeito que você quiser — inclusive sem spoilers.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[430px]:flex-row">
              <Link href="/register" className="min-tap inline-flex justify-center gap-3 bg-[var(--red)] px-6 py-4 font-condensed text-sm font-900 uppercase tracking-widest text-white transition-opacity hover:opacity-90">
                Jogar o Fantasy <ArrowIcon />
              </Link>
              <Link href="/companion" className="min-tap inline-flex justify-center gap-3 border border-[var(--border)] bg-[var(--bg-card)] px-6 py-4 font-condensed text-sm font-900 uppercase tracking-widest text-[var(--text)] transition-colors hover:border-[var(--text-muted)]">
                <BellIcon /> Ativar Companion
              </Link>
            </div>
            <p className="mt-4 font-condensed text-[10px] font-700 uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Fantasy com conta · Companion sem cadastro
            </p>
          </div>

          <div className="relative min-h-[440px] overflow-hidden border-t border-[var(--border)] lg:min-h-full lg:border-l lg:border-t-0">
            {bannerUrl ? (
              <Image
                src={bannerUrl}
                alt={currentEvent?.name || "Card atual"}
                fill
                priority
                className="object-cover"
                style={{ objectPosition: currentEvent?.banner_object_position || "center" }}
              />
            ) : (
              <div className="absolute inset-0 bg-[var(--bg-secondary)]" style={{ backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,8,8,0.98)_4%,rgba(8,8,8,0.42)_58%,rgba(8,8,8,0.12))]" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
              <div className="mb-4 flex items-center gap-2">
                <span className="bg-[var(--red)] px-2 py-1 font-condensed text-[10px] font-900 uppercase tracking-widest">Card em destaque</span>
                {currentEvent?.status === "live" && (
                  <span className="flex items-center gap-1.5 font-condensed text-[10px] font-900 uppercase tracking-widest">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--red)]" /> Ao vivo
                  </span>
                )}
              </div>
              <h2 className="font-condensed text-4xl font-900 uppercase leading-none sm:text-5xl">
                {currentEvent?.name || "O próximo card começa aqui"}
              </h2>
              {currentEvent && (
                <p className="mt-3 font-condensed text-sm font-600 uppercase tracking-wider text-white/70">
                  {formatEventDate(currentEvent.event_date)}
                  {currentEvent.location ? ` · ${currentEvent.location}` : ""}
                </p>
              )}
            </div>
            <div className="absolute right-0 top-0 flex h-16 w-16 items-center justify-center bg-[var(--red)] font-condensed text-[10px] font-900 uppercase tracking-widest text-white [writing-mode:vertical-rl]">
              Fight night
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-[var(--border)] border-x border-[var(--border)] md:grid-cols-4 md:divide-y-0">
          {["Picks por luta", "Ranking e ligas", "Desafios 1×1", "Alertas ao vivo"].map((item, index) => (
            <div key={item} className="flex items-center gap-3 px-5 py-4">
              <span className="font-condensed text-[10px] font-900 text-[var(--red)]">0{index + 1}</span>
              <span className="font-condensed text-[11px] font-800 uppercase tracking-widest text-[var(--text-secondary)]">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 font-condensed text-[10px] font-900 uppercase tracking-[0.28em] text-[var(--red)]">Dois jeitos de entrar no card</p>
          <h2 className="font-condensed text-4xl font-900 uppercase leading-[0.95] sm:text-5xl">Você escolhe a experiência.</h2>
        </div>

        <div className="grid border border-[var(--border)] lg:grid-cols-2">
          <article className="flex min-h-[430px] flex-col p-6 sm:p-9 lg:border-r lg:border-[var(--border)]">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-condensed text-[10px] font-900 uppercase tracking-[0.22em] text-[var(--red)]">01 · Modo Fantasy</span>
                <h3 className="mt-3 font-condensed text-4xl font-900 uppercase leading-none">Crave seus picks.</h3>
              </div>
              <span className="font-condensed text-6xl font-900 leading-none text-[var(--border)]">+3</span>
            </div>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
              Escolha vencedor, método e round. Some pontos em cada luta, suba
              no ranking e dispute ligas e desafios com seus amigos.
            </p>
            <div className="mt-auto pt-10">
              <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center border-y border-[var(--border)] py-5 text-center">
                <div><strong className="block font-condensed text-2xl font-900">+1</strong><span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Vencedor</span></div>
                <span className="text-[var(--text-muted)]">+</span>
                <div><strong className="block font-condensed text-2xl font-900">+1</strong><span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Método</span></div>
                <span className="text-[var(--text-muted)]">+</span>
                <div><strong className="block font-condensed text-2xl font-900">+1</strong><span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Round</span></div>
              </div>
              <Link href="/register" className="mt-6 inline-flex items-center gap-2 font-condensed text-xs font-900 uppercase tracking-widest text-[var(--red)] hover:underline">
                Começar a jogar <ArrowIcon />
              </Link>
            </div>
          </article>

          <article className="flex min-h-[430px] flex-col bg-[var(--bg-card)] p-6 sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-condensed text-[10px] font-900 uppercase tracking-[0.22em] text-[var(--red)]">02 · Modo Companion</span>
                <h3 className="mt-3 font-condensed text-4xl font-900 uppercase leading-none">O card no seu ritmo.</h3>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[var(--red)] text-white"><BellIcon /></div>
            </div>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
              Não quer apostar? Siga o evento inteiro ou apenas aquela luta que
              importa. Você decide quais alertas entram — e se quer ver resultados.
            </p>
            <div className="mt-8 border border-[var(--border)]">
              {[
                ["É a próxima", "Prepare a transmissão", "on"],
                ["Está começando", "Entradas e apresentações", "on"],
                ["Resultado", "Vencedor, método e round", "off"],
              ].map(([title, description, status]) => (
                <div key={title} className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 last:border-b-0">
                  <span className={`h-2.5 w-2.5 border ${status === "on" ? "border-[var(--red)] bg-[var(--red)]" : "border-[var(--text-muted)]"}`} />
                  <div className="min-w-0 flex-1"><strong className="block font-condensed text-xs font-900 uppercase tracking-wide">{title}</strong><span className="text-[11px] text-[var(--text-muted)]">{description}</span></div>
                  {title === "Resultado" && <span className="border border-[rgba(232,0,26,0.45)] px-1.5 py-1 font-condensed text-[8px] font-900 uppercase tracking-widest text-[var(--red)]">spoiler off</span>}
                </div>
              ))}
            </div>
            <Link href="/companion" className="mt-6 inline-flex items-center gap-2 font-condensed text-xs font-900 uppercase tracking-widest text-[var(--red)] hover:underline">
              Ativar meu Companion <ArrowIcon />
            </Link>
          </article>
        </div>
      </section>

      {stats.length > 0 && (
        <section className="border-y border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className={`mx-auto grid max-w-6xl divide-y divide-[var(--border)] px-5 sm:px-6 md:divide-x md:divide-y-0 ${statsGridClass}`}>
            {stats.map((item) => (
              <div key={item.label} className="py-6 md:px-6 first:pl-0">
                <strong className="font-condensed text-4xl font-900 leading-none text-[var(--red)]">{item.value}</strong>
                <span className="ml-3 font-condensed text-[10px] font-800 uppercase tracking-widest text-[var(--text-muted)]">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
        <div className="grid gap-10 border-l-4 border-[var(--red)] bg-[var(--bg-secondary)] px-6 py-10 md:grid-cols-[1fr_auto] md:items-center md:px-10">
          <div>
            <p className="font-condensed text-[10px] font-900 uppercase tracking-[0.24em] text-[var(--red)]">Seu card. Suas regras.</p>
            <h2 className="mt-2 font-condensed text-3xl font-900 uppercase leading-none sm:text-4xl">Entre para competir ou só para acompanhar.</h2>
          </div>
          <div className="flex flex-col gap-3 min-[430px]:flex-row">
            <Link href="/companion" className="min-tap border border-[var(--border)] px-5 font-condensed text-xs font-900 uppercase tracking-widest hover:border-[var(--text-muted)]">Só acompanhar</Link>
            <Link href="/register" className="min-tap bg-[var(--red)] px-5 font-condensed text-xs font-900 uppercase tracking-widest text-white hover:opacity-90">Criar conta</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <BrandLogo className="h-5 w-auto" />
          <p className="font-condensed text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Não afiliado ao UFC®</p>
        </div>
      </footer>
    </main>
  );
}
