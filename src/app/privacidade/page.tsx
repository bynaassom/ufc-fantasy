import Link from "next/link";

const sectionClass = "mb-10";
const headingClass =
  "font-condensed font-900 text-lg uppercase tracking-wide mb-3";
const bodyClass = "text-sm leading-relaxed";

export default function PrivacidadePage() {
  return (
    <main
      className="min-h-[100dvh] flex flex-col"
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
          Última atualização: Agosto de 2026
        </p>

        <section className={sectionClass}>
          <h2 className={headingClass} style={{ color: "var(--text)" }}>
            Sobre este aviso
          </h2>
          <p className={bodyClass} style={{ color: "var(--text-secondary)" }}>
            O UFC Fantasy é um projeto independente de fã, sem vínculo,
            patrocínio ou endosso do UFC. Este aviso explica, em linguagem
            simples, quais dados tratamos quando você usa a plataforma e como
            pode exercer seus direitos. Ele deve ser lido junto aos{" "}
            <Link href="/termos" className="underline" style={{ color: "var(--red)" }}>
              Termos de Uso
            </Link>
            . Para dúvidas ou solicitações sobre seus dados, escreva para{" "}
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

        <section className={sectionClass}>
          <h2 className={headingClass} style={{ color: "var(--text)" }}>
            Dados que podemos tratar
          </h2>
          <p className={bodyClass} style={{ color: "var(--text-secondary)" }}>
            Dependendo das funcionalidades usadas, podemos tratar: (a) dados
            de cadastro e autenticação, como email, senha (gerenciada pelo
            Supabase Auth), apelido, nome e sobrenome; (b) dados do jogo, como
            picks, pontuação, ligas, desafios, badges e histórico de alterações;
            (c) conteúdo que você publica, como mensagens e preferências; (d)
            dados técnicos e de segurança, como endereço IP, user agent,
            identificadores de requisição, registros de atividade e informações
            do navegador; e (e) dados de notificações push, como endpoint e
            chaves necessárias para entregar o alerta, somente após a
            permissão do navegador.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass} style={{ color: "var(--text)" }}>
            Como usamos os dados
          </h2>
          <p className={bodyClass} style={{ color: "var(--text-secondary)" }}>
            Usamos esses dados para criar e proteger sua conta, salvar e
            calcular picks, exibir rankings e perfis, operar ligas, desafios e
            chat, enviar notificações solicitadas, sincronizar eventos e
            resultados, detectar abuso ou fraude, moderar conteúdo, corrigir
            falhas e manter a segurança e a integridade da competição. Também
            podemos usar registros técnicos agregados para diagnosticar e
            melhorar a plataforma.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass} style={{ color: "var(--text)" }}>
            Visibilidade dentro da plataforma
          </h2>
          <p className={bodyClass} style={{ color: "var(--text-secondary)" }}>
            Para que o jogo funcione, seu apelido, nome informado, pontuação,
            posição no ranking, badges e outros elementos do perfil podem ser
            exibidos para outros usuários. Picks, resultados, mensagens e
            atividades podem ficar visíveis conforme a funcionalidade e as
            regras da liga. Evite publicar informações pessoais ou sensíveis no
            perfil e no chat.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass} style={{ color: "var(--text)" }}>
            Compartilhamento e prestadores
          </h2>
          <p className={bodyClass} style={{ color: "var(--text-secondary)" }}>
            Não vendemos dados pessoais. Para prestar o serviço, dados podem
            ser processados por fornecedores de infraestrutura e operação,
            incluindo Supabase (autenticação e banco de dados), Vercel
            (hospedagem, execução e logs) e os serviços de entrega de
            notificações do navegador. Esses fornecedores atuam conforme seus
            próprios termos e políticas de privacidade. A aplicação também
            consulta fontes externas para dados públicos de eventos, lutas e
            resultados, como UFC.com, UFCStats e fontes de odds; essas consultas
            não dão a essas fontes acesso à sua conta do UFC Fantasy.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass} style={{ color: "var(--text)" }}>
            Retenção e exclusão
          </h2>
          <p className={bodyClass} style={{ color: "var(--text-secondary)" }}>
            Mantemos os dados enquanto a conta estiver ativa e pelo tempo
            necessário para preservar a apuração, a segurança, auditorias e
            obrigações legais. Você pode solicitar a exclusão da conta pelo
            email de contato. Alguns registros de segurança, integridade do
            jogo, backups ou obrigações legais podem permanecer por período
            limitado e depois ser eliminados ou anonimizados, quando aplicável.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass} style={{ color: "var(--text)" }}>
            Segurança
          </h2>
          <p className={bodyClass} style={{ color: "var(--text-secondary)" }}>
            Usamos HTTPS/TLS em trânsito, controles de acesso do Supabase,
            políticas de segurança no banco, validação no servidor, limitação
            de requisições e registros de auditoria. Nenhum serviço online é
            completamente imune a riscos; por isso, mantenha sua senha em
            segredo e avise-nos se identificar comportamento suspeito.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass} style={{ color: "var(--text)" }}>
            Cookies, sessão e notificações
          </h2>
          <p className={bodyClass} style={{ color: "var(--text-secondary)" }}>
            A plataforma usa cookies ou armazenamento local necessários para
            manter sua sessão, lembrar preferências e permitir recursos como o
            aplicativo instalável. Notificações push só são ativadas depois da
            permissão do navegador e podem ser revogadas nas configurações do
            dispositivo. Não usamos esses recursos para vender publicidade
            personalizada.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass} style={{ color: "var(--text)" }}>
            Seus direitos
          </h2>
          <p className={bodyClass} style={{ color: "var(--text-secondary)" }}>
            Você pode solicitar confirmação e acesso aos dados, correção,
            anonimização, bloqueio ou eliminação quando cabível, informação
            sobre compartilhamentos, portabilidade quando regulamentada,
            revisão de decisões automatizadas (se aplicável) e revogação de
            consentimentos. Envie o pedido para contato@ufcfantasy.com com
            detalhes suficientes para localizarmos a conta. Podemos pedir uma
            comprovação de identidade para proteger seus dados. Se entender que
            sua solicitação não foi atendida, você também pode procurar a ANPD.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass} style={{ color: "var(--text)" }}>
            Alterações e contato
          </h2>
          <p className={bodyClass} style={{ color: "var(--text-secondary)" }}>
            Podemos atualizar este aviso quando a plataforma ou as leis
            mudarem. A data no topo indica a versão vigente; alterações
            relevantes serão comunicadas na aplicação quando possível. Para
            exercer direitos, esclarecer este aviso ou relatar um incidente,
            entre em contato pelo email{" "}
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

        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Este texto é um aviso informativo e não substitui uma revisão jurídica
          específica para a operação da plataforma.
        </p>
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
