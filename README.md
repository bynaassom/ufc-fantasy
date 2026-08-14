# UFC Fantasy Pick'em

App web/PWA para picks de eventos do UFC, com ranking, ligas, desafios, chat, notificações, páginas compartilháveis e painel admin para operar cards, resultados e usuários.

## Stack

- Next.js 16, React 19 e TypeScript
- Tailwind CSS com tema claro/escuro via CSS variables
- Supabase Auth, Postgres e RLS
- Vitest e Playwright
- Web Push com VAPID
- `date-fns`, `react-hot-toast`, `html-to-image`, `zod`, `zustand`

## Funcionalidades

- Cadastro/login com Supabase e callback seguro
- Picks por luta com vencedor, método e round
- Ranking geral, por evento e por temporada
- Ligas com convite, standings e chat de grupo
- Desafios entre jogadores
- Chat global para usuários logados
- Live fight-night com feed e placar durante eventos
- Badges, trophy case, perfil público, rivalries e atribuição manual de badges especiais pelo admin
- Páginas públicas de share para picks e resultados
- Recap de evento
- Notificações push e preferências por usuário
- Painel admin para eventos, lutas, odds, links de fontes, resultados, badges, usuários, auditoria e analytics
- Sincronização automática de eventos, cards, resultados e ciclo de eventos via cron externo

## Setup Local

1. Instale dependências:

```bash
npm install
```

2. Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

SYNC_SECRET=um_segredo_para_jobs_externos
NOTIFICATIONS_CRON_SECRET=um_segredo_para_o_cron_de_notificacoes

NEXT_PUBLIC_VAPID_PUBLIC_KEY=sua_vapid_public_key
VAPID_PRIVATE_KEY=sua_vapid_private_key
VAPID_SUBJECT=mailto:seu-email@exemplo.com

ODDS_API_KEY=sua_key_da_the_odds_api
```

3. Rode em desenvolvimento:

```bash
npm run dev
```

## Banco De Dados

O schema base histórico está em `schema.sql`, mas projetos em produção devem aplicar as migrations em ordem cronológica dentro de `supabase/migrations/`.

Para um projeto novo:

1. Execute `schema.sql` se quiser partir do schema base.
2. Aplique todas as migrations em `supabase/migrations/` que ainda não estão refletidas no banco.

Para um projeto existente:

1. Aplique somente as migrations pendentes, sempre em ordem pelo timestamp do nome do arquivo.
2. Verifique especialmente as migrations recentes de chat, rivalries, `picks_lock_at` e RPC transacional de resultados.

Migrations recentes importantes:

- `20260614000001_chat_messages.sql`
- `20260614000002_chat_group_id.sql`
- `20260614000003_rivalries_and_badge_archive.sql`
- `20260615000000_fix_picks_lock_at.sql`
- `20260615000001_transactional_sync.sql`
- `20260615000002_fix_transactional_sync_rpc.sql`
- `20260615000003_badge_manual_awards.sql`
- `20260814000000_event_timing_and_security.sql`

## Admin

Depois de criar seu usuário, promova-o a admin no SQL Editor do Supabase:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = 'SEU_USER_UUID';
```

## Cron Jobs

Use cron-job.org ou serviço equivalente. Todos os jobs abaixo usam `POST`.

### Sincronizar Eventos

- Endpoint: `POST /api/cron/sync-events`
- Header: `Authorization: Bearer <SYNC_SECRET>`
- Frequência no cron-job.org: diariamente
- Função: cria/sincroniza eventos futuros, lê o início das preliminares na UFC.com, deriva o lock 30 minutos antes, tenta descobrir URL do UFCStats e sincroniza o card.

### Sincronizar Resultados

- Endpoint: `POST /api/sync-results`
- Header: `Authorization: Bearer <SYNC_SECRET>`
- Frequência sugerida: a cada 10 minutos durante janelas de evento
- Função: busca resultados nas fontes configuradas, aplica consenso e pontua picks via RPC transacional.

### Notificações E Ciclo Do Evento

- Endpoint: `POST /api/cron/notifications`
- Header: `Authorization: Bearer <NOTIFICATIONS_CRON_SECRET>`
- Frequência no cron-job.org: a cada 5 minutos
- Função: envia notificações, promove eventos para `live` no início das preliminares, completa eventos quando todos os resultados forem confirmados e tenta fallback de sync-results durante janelas ativas.

No cron-job.org, configure chamadas `POST` e envie o secret correspondente no header `Authorization` conforme descrito acima.

### Verificação Do Card

- Endpoint: `POST /api/cron/card-verification`
- Header: `Authorization: Bearer <SYNC_SECRET>`
- Frequência sugerida: a cada 1 hora
- Função: verifica cards em T-72h e T-18h, compara fontes e registra alertas antes de alterações sensíveis.

## Segurança

- Rotas admin exigem sessão, role `admin` e usuário não banido.
- Rotas cron exigem bearer secret.
- RLS protege dados privados e ações de usuário.
- Scrapers aceitam apenas hosts permitidos.
- Middleware adiciona headers de segurança.
- A `SUPABASE_SERVICE_ROLE_KEY` só deve ser usada server-side.

## Estrutura

```text
src/
  app/             rotas Next.js e APIs
  components/      UI e fluxos client-side
  lib/             integrações, scraping, helpers e segurança
  server/          services, repositories, validators e auth server-side
  stores/          estado client-side compartilhado
  types/           tipos compartilhados
supabase/
  migrations/      migrations incrementais do banco
docs/              documentação de produto e specs
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run test
npm run test:e2e
```

## Verificação Antes De Deploy

```bash
npx tsc --noEmit
npm run test
npm run build
```

## Observações

- Não commite `.env.local` nem chaves do Supabase.
- Se algum segredo já foi exposto, rotacione no provedor.
- Artefatos como `.next/`, `*.tsbuildinfo`, `.playwright-cli/` e `output/` são ignorados.
- Este projeto não possui vínculo oficial com o UFC.

## Licença

MIT. Veja `LICENSE`.
