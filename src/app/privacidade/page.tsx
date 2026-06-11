import Link from "next/link";

export default function PrivacidadePage() {
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
            Política de Privacidade
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
            Coleta de Dados
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Coletamos apenas os dados essenciais para o funcionamento do
            aplicativo: nome, email e foto de perfil. Estas informações são
            necessárias para criar e gerenciar sua conta, permitir que você
            participe de ligas e seja identificado por outros usuários no
            ranking.
          </p>
        </section>

        <section className="mb-10">
          <h2
            className="font-condensed font-900 text-lg uppercase tracking-wide mb-3"
            style={{ color: "var(--text)" }}
          >
            Uso de Dados
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Seus dados são utilizados exclusivamente para viabilizar as
            funcionalidades do UFC Fantasy: registro de picks, cálculo de
            pontuação, exibição de rankings, formação de ligas e comunicação de
            resultados. Não utilizamos seus dados para qualquer outra finalidade.
          </p>
        </section>

        <section className="mb-10">
          <h2
            className="font-condensed font-900 text-lg uppercase tracking-wide mb-3"
            style={{ color: "var(--text)" }}
          >
            Compartilhamento
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Não compartilhamos seus dados pessoais com terceiros. Suas
            informações não são vendidas, alugadas ou transferidas para
            quaisquer entidades externas. Os dados de picks e pontuação são
            visíveis apenas dentro do contexto do aplicativo para outros
            usuários.
          </p>
        </section>

        <section className="mb-10">
          <h2
            className="font-condensed font-900 text-lg uppercase tracking-wide mb-3"
            style={{ color: "var(--text)" }}
          >
            Segurança
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Utilizamos criptografia de ponta a ponta e protocolo HTTPS para
            proteger a transmissão dos seus dados. Sua senha é armazenada de
            forma segura com hash criptográfico. Adotamos as melhores práticas
            de segurança para proteger suas informações contra acesso não
            autorizado.
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
            Em caso de dúvidas sobre esta política de privacidade, entre em
            contato pelo email{" "}
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
