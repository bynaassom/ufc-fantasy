import Link from "next/link";
import Image from "next/image";
import { getLandingPageData } from "@/server/services/app";

// ============================================================
// COLOQUE A URL DO BANNER DO EVENTO AQUI (opcional)
// ============================================================
const EVENT_BANNER_URL = "";
// ============================================================

const PRIZE_TIERS = [
  {
    place: "1º",
    title: "Campeão da rodada",
    rewards: [
      "Luva autografada",
      "Camiseta do evento",
      "Cartaz A2 autografado",
      "Esculhacho ao vivo na próxima live",
      "Post de anúncio dos vencedores com colab",
    ],
  },
  {
    place: "2º",
    title: "Vice-campeão",
    rewards: ["Camiseta do evento autografada", "Cartaz A3"],
  },
  {
    place: "3º",
    title: "Bronze da humilhação",
    rewards: [
      "Vídeo do Moicano desejando mais sorte, porque medalha de bronze é humilhação demais. Melhor era nem ter participado.",
    ],
  },
] as const;

export default async function LandingPage() {
  const { currentEvent } = await getLandingPageData();
  const bannerUrl = currentEvent?.banner_image_url || EVENT_BANNER_URL || null;

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-dark.svg"
              alt="UFC Fantasy"
              width={113}
              height={20}
              className="h-5 w-auto"
              priority
            />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="font-condensed font-700 text-sm uppercase tracking-widest px-5 py-2 transition-all hover:opacity-70"
              style={{ color: "var(--text-secondary)" }}
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="font-condensed font-700 text-sm uppercase tracking-widest px-5 py-2.5 text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--red)" }}
            >
              Registrar
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <section
        className="relative w-full overflow-hidden"
        style={{ minHeight: "60vh" }}
      >
        {bannerUrl ? (
          <div className="absolute inset-0 z-0">
            <Image
              src={bannerUrl}
              alt={currentEvent?.name || "Evento"}
              fill
              className="object-cover"
              priority
            />
            <div
              className="absolute inset-0 z-10"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0.85) 10%, rgba(0,0,0,0.2) 100%)",
              }}
            />
          </div>
        ) : (
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, var(--border) 0px, var(--border) 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, var(--border) 0px, var(--border) 1px, transparent 1px, transparent 60px)",
            }}
          />
        )}

        <div className="absolute inset-0 flex items-center">
          <div className="relative z-20 max-w-6xl mx-auto px-6 w-full">
            <h1
              className="font-condensed uppercase leading-none mb-4"
              style={{
                fontWeight: 700,
                fontSize: "clamp(4rem, 10vw, 9rem)",
                color: "var(--text)",
                letterSpacing: "-0.01em",
                lineHeight: 0.9,
              }}
            >
              FAÇA SEUS
              <br />
              <span style={{ color: "var(--red)" }}>PICKS</span>
            </h1>
            {currentEvent && (
              <p
                className="font-condensed font-700 uppercase tracking-widest text-lg mb-8"
                style={{ color: "var(--text-secondary)" }}
              >
                {currentEvent.name} · {currentEvent.location}
              </p>
            )}
            <Link
              href="/register"
              className="inline-flex items-center gap-3 font-condensed font-900 text-base uppercase tracking-widest px-8 py-4 text-white transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "var(--red)" }}
            >
              PARTICIPE AGORA
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRIZES ── */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-12 w-full">
          <div className="red-line">
            <h2 className="section-title">Premiações</h2>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-px"
            style={{ backgroundColor: "var(--border)" }}
          >
            <article
              className="p-6 md:p-8 flex flex-col gap-6"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p
                    className="font-condensed font-900 uppercase leading-none"
                    style={{ color: "var(--red)", fontSize: "clamp(4rem, 12vw, 7rem)" }}
                  >
                    {PRIZE_TIERS[0].place}
                  </p>
                  <h3
                    className="font-condensed font-900 text-3xl uppercase"
                    style={{ color: "var(--text)" }}
                  >
                    {PRIZE_TIERS[0].title}
                  </h3>
                </div>
                <span
                  className="w-fit font-condensed font-900 text-sm uppercase px-4 py-2 text-white"
                  style={{ backgroundColor: "var(--red)" }}
                >
                  Pacote completo
                </span>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-px">
                {PRIZE_TIERS[0].rewards.map((reward) => (
                  <li
                    key={reward}
                    className="min-h-16 p-4 flex items-center"
                    style={{ backgroundColor: "var(--bg-elevated)" }}
                  >
                    <span
                      className="font-condensed font-700 text-base uppercase leading-tight"
                      style={{ color: "var(--text)" }}
                    >
                      {reward}
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <div className="grid grid-cols-1 gap-px">
              {PRIZE_TIERS.slice(1).map((tier) => (
                <article
                  key={tier.place}
                  className="p-6 md:p-7 flex flex-col gap-4"
                  style={{ backgroundColor: "var(--bg-card)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className="font-condensed font-900 text-5xl uppercase leading-none"
                        style={{ color: "var(--text)" }}
                      >
                        {tier.place}
                      </p>
                      <h3
                        className="font-condensed font-900 text-xl uppercase mt-2"
                        style={{ color: "var(--text)" }}
                      >
                        {tier.title}
                      </h3>
                    </div>
                    <span
                      className="font-condensed font-900 text-xs uppercase px-3 py-1"
                      style={{
                        border: "1px solid var(--red)",
                        color: "var(--red)",
                      }}
                    >
                      Prêmio
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {tier.rewards.map((reward) => (
                      <li
                        key={reward}
                        className="flex gap-3 text-sm leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <span
                          className="mt-2 h-1.5 w-1.5 flex-shrink-0"
                          style={{ backgroundColor: "var(--red)" }}
                        />
                        <span>{reward}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SCORING INFO ── */}
      <section className="max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="red-line">
          <span className="section-title">Como funciona</span>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-px"
          style={{ backgroundColor: "var(--border)" }}
        >
          {[
            {
              num: "01",
              title: "ACERTE O VENCEDOR",
              desc: "Escolha quem você acha que vai ganhar cada luta do card.",
              pts: "+1 PT",
            },
            {
              num: "02",
              title: "ACERTE O MÉTODO",
              desc: "Decisão, finalização ou nocaute — seja preciso na via de vitória.",
              pts: "+1 PT",
            },
            {
              num: "03",
              title: "ACERTE O ROUND",
              desc: "Máxima precisão: em qual round a luta vai terminar.",
              pts: "+1 PT",
            },
          ].map((item) => (
            <div
              key={item.num}
              className="p-8 flex flex-col gap-4"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              <div className="flex items-start justify-between">
                <span
                  className="font-condensed font-900 text-5xl leading-none"
                  style={{ color: "var(--border)" }}
                >
                  {item.num}
                </span>
                <span
                  className="font-condensed font-900 text-sm px-3 py-1"
                  style={{ backgroundColor: "var(--red)", color: "white" }}
                >
                  {item.pts}
                </span>
              </div>
              <div>
                <p
                  className="font-condensed font-900 text-lg uppercase tracking-wide mb-2"
                  style={{ color: "var(--text)" }}
                >
                  {item.title}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-3 p-4 flex items-center justify-between"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            className="font-condensed font-700 text-sm uppercase tracking-widest"
            style={{ color: "var(--text-secondary)" }}
          >
            Máximo por luta
          </span>
          <span
            className="font-condensed font-900 text-2xl"
            style={{ color: "var(--red)" }}
          >
            3 PONTOS
          </span>
        </div>
      </section>

      {/* ── CTA BOTTOM ── */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p
              className="font-condensed font-900 text-2xl uppercase tracking-wide"
              style={{ color: "var(--text)" }}
            >
              Pronto para competir?
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Crie sua conta grátis e faça seus picks antes do lock.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 min-[380px]:w-auto min-[380px]:flex-row min-[380px]:items-center">
            <Link
              href="/login"
              className="w-full px-6 py-3 text-center font-condensed font-700 text-sm uppercase tracking-widest transition-all hover:opacity-70 min-[380px]:w-auto"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              Já tenho conta
            </Link>
            <Link
              href="/register"
              className="w-full px-6 py-3 text-center font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 min-[380px]:w-auto"
              style={{ backgroundColor: "var(--red)" }}
            >
              Registre-se
            </Link>
          </div>
        </div>
      </section>

      <footer
        className="py-5 text-center"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <p
          className="text-xs uppercase tracking-widest font-condensed"
          style={{ color: "var(--text-muted)" }}
        >
          UFC FANTASY — NÃO AFILIADO AO UFC®
        </p>
      </footer>
    </main>
  );
}
