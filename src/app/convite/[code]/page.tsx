import { redirect } from "next/navigation";
import Link from "next/link";
import PublicShareHeader from "@/components/share/PublicShareHeader";
import { processInviteLink } from "@/server/services/app";

type Params = {
  params: Promise<{ code: string }>;
};

export default async function ConvitePage(props: Params) {
  const params = await props.params;
  const result = await processInviteLink(params.code);

  if (result.status === "invalid") {
    return (
      <main className="min-h-[100dvh]" style={{ backgroundColor: "var(--bg)" }}>
        <PublicShareHeader />
        <section className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="font-condensed text-4xl font-900 uppercase" style={{ color: "var(--text)" }}>
            Convite inválido
          </p>
          <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            Esse código de convite não existe ou expirou.
          </p>
          <Link href="/ligas" className="mt-8 inline-block px-5 py-3 font-condensed text-xs font-900 uppercase tracking-widest text-white" style={{ backgroundColor: "var(--red)" }}>
            Ver ligas
          </Link>
        </section>
      </main>
    );
  }

  if (result.status === "needs_login") {
    redirect(`/login?redirect=/convite/${encodeURIComponent(params.code)}`);
  }

  if (result.status === "banned") {
    return (
      <main className="min-h-[100dvh]" style={{ backgroundColor: "var(--bg)" }}>
        <PublicShareHeader />
        <section className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="font-condensed text-4xl font-900 uppercase" style={{ color: "var(--text)" }}>
            Acesso negado
          </p>
          <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            Sua conta não pode entrar em ligas no momento.
          </p>
        </section>
      </main>
    );
  }

  redirect(`/ligas/${result.group.id}`);
}
