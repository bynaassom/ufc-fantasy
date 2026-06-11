import Link from "next/link";

export default function TermosPage() {
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-condensed font-900 text-sm uppercase tracking-widest">
              <span style={{ color: "var(--red)" }}>UFC</span>{" "}
              <span style={{ color: "var(--text)" }}>FANTASY</span>
            </span>
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 w-full">
        <div className="red-line">
          <span className="section-title text-2xl">
            Termos de Uso
          </span>
        </div>

        <p className="text-sm mb-10" style={{ color: "var(--text-secondary)" }}>
          Última atualização: Junho de 2026
        </p>

        <section className="mb-10">
          <h2
            className="font-condensed font-900 text-lg uppercase tracking-wide mb-3"
            style={{ color: "var(--text)" }}
          >
            Aceitação dos Termos
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Ao criar uma conta e utilizar o UFC Fantasy, você declara ter lido,
            entendido e concordado com estes Termos de Uso. Caso não concorde
            com alguma das condições, não utilize o aplicativo.
          </p>
        </section>

        <section className="mb-10">
          <h2
            className="font-condensed font-900 text-lg uppercase tracking-wide mb-3"
            style={{ color: "var(--text)" }}
          >
            Funcionamento do App
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            O UFC Fantasy é um jogo de prognósticos onde os usuários registram
            seus palpites (&quot;picks&quot;) sobre os resultados das lutas de eventos do
            UFC. A pontuação é calculada com base na precisão dos palpites. O
            app não envolve apostas com dinheiro real e é oferecido
            exclusivamente para fins de entretenimento.
          </p>
        </section>

        <section className="mb-10">
          <h2
            className="font-condensed font-900 text-lg uppercase tracking-wide mb-3"
            style={{ color: "var(--text)" }}
          >
            Responsabilidades do Usuário
          </h2>
          <ul className="text-sm leading-relaxed space-y-2" style={{ color: "var(--text-secondary)" }}>
            <li>• Manter a confidencialidade de sua conta e senha</li>
            <li>• Não criar múltiplas contas para obter vantagem</li>
            <li>• Não utilizar bots ou qualquer forma de automação</li>
            <li>• Respeitar os demais usuários e a comunidade</li>
            <li>• Fornecer informações precisas durante o cadastro</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2
            className="font-condensed font-900 text-lg uppercase tracking-wide mb-3"
            style={{ color: "var(--text)" }}
          >
            Limitação de Responsabilidade
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            O UFC Fantasy não se responsabiliza por perdas ou danos decorrentes
            do uso do aplicativo. O serviço é fornecido &quot;como está&quot;, podendo
            sofrer interrupções temporárias para manutenção ou atualizações. Não
            garantimos a disponibilidade contínua ou livre de erros.
          </p>
        </section>

        <section className="mb-10">
          <h2
            className="font-condensed font-900 text-lg uppercase tracking-wide mb-3"
            style={{ color: "var(--text)" }}
          >
            Alterações nos Termos
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Estes Termos de Uso podem ser alterados a qualquer momento. As
            alterações entrarão em vigor imediatamente após a publicação no
            aplicativo. O uso contínuo do UFC Fantasy após as alterações
            constitui aceitação dos novos termos.
          </p>
        </section>

        <section className="mb-10">
          <h2
            className="font-condensed font-900 text-lg uppercase tracking-wide mb-3"
            style={{ color: "var(--text)" }}
          >
            Contato
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Para dúvidas sobre estes termos, entre em contato pelo email{" "}
            <a
              href="mailto:contato@ufcfantasy.com"
              style={{ color: "var(--red)" }}
              className="underline"
            >
              contato@ufcfantasy.com
            </a>
            .
          </p>
        </section>
      </div>

      <footer
        className="py-6 text-center"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <Link
          href="/"
          className="font-condensed font-700 text-xs uppercase tracking-widest transition-all hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}
        >
          Voltar para o início
        </Link>
      </footer>
    </main>
  );
}
