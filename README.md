
# 🥊 UFC Fantasy Pick'em

Um web app de *Pick'em Game* (estilo Fantasy) onde entusiastas de MMA podem palpitar nos resultados de cada luta dos eventos do UFC, acompanhar rankings por evento e disputar a liderança no ranking geral.

Este projeto nasceu de uma "vibe coding" com o Claude, focado em ser uma ferramenta comunitária, open-source e sem fins lucrativos para fãs de luta.

### 🚀 Funcionalidades

*   **Palpites (Picks):** Escolha o vencedor de cada luta em eventos futuros.
*   **Rankings Dinâmicos:** Visualize sua performance em eventos específicos ou sua consistência no ranking geral.
*   **Área Administrativa:** Interface para gerenciamento manual de lutadores, eventos e inserção de resultados (essencial para manter o app atualizado sem depender de APIs pagas).
*   **Autenticação Completa:** Login, registro e verificação de e-mail via Supabase.
*   **Interface Moderna:** Design responsivo com suporte a temas (Dark/Light mode).

### 🛠️ Tecnologias

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
*   **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
*   **Banco de Dados & Auth:** [Supabase](https://supabase.com/)
*   **Componentes UI:** Radix UI / Lucide React

### ⚙️ Configuração e Instalação

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/ufc-fantasy.git
    cd ufc-fantasy
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Variáveis de Ambiente:**
    Crie um arquivo `.env.local` na raiz do projeto e preencha com suas credenciais:
    ```env
    # Supabase
    NEXT_PUBLIC_SUPABASE_URL=seu_url_do_supabase
    NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase

    # App
    NEXT_PUBLIC_APP_URL=http://localhost:3000

    # Admin
    ADMIN_SECRET_KEY=sua_chave_secreta_para_acesso_admin
    ```

4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

### 📂 Estrutura do Projeto

*   `src/app`: Rotas da aplicação e APIs internas.
*   `src/components`: Componentes reutilizáveis (Admin, Eventos, Layout, UI).
*   `src/lib`: Configurações do cliente/servidor Supabase e utilitários.
*   `src/types`: Definições de tipos TypeScript para lutadores, lutas e usuários.

### 🤝 Contribuição

Como este é um projeto **Open Source**, sinta-se à vontade para abrir *Issues* ou enviar *Pull Requests*. Toda ajuda para melhorar a lógica de pontuação, interface ou automação de dados é bem-vinda!

### 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
*Nota: Este projeto não possui vínculo oficial com o UFC (Ultimate Fighting Championship).* 
