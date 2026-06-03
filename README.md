# UFC Fantasy Pick'em

App web de picks para eventos do UFC. Os usuários escolhem vencedores, método e round, acompanham ranking e histórico, e um admin mantém eventos, lutas, odds e resultados.

## Stack

- Next.js 14 + React 18 + TypeScript
- Tailwind CSS
- Supabase Auth + Postgres + RLS
- `react-hot-toast`, `date-fns`, `zustand`

## Funcionalidades

- Cadastro, login e callback de autenticação com Supabase
- Picks por luta com lock por horário de evento
- Ranking geral e por evento
- Histórico de eventos e pontuação do usuário
- Painel admin para eventos, lutas, odds e sync de resultados
- Comparativo de stats dos atletas via scraping do UFC

## Setup local

1. Instale as dependências:

```bash
npm install
```

2. Crie o arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
SYNC_SECRET=um_segredo_para_jobs_externos
ODDS_API_KEY=sua_key_da_the_odds_api
```

3. Rode o app:

```bash
npm run dev
```

## Banco de dados

Há dois tipos de arquivo SQL neste projeto:

- [`schema.sql`](/Users/naassom/Downloads/ufc-fantasy%202/schema.sql): referência do schema atual do projeto
- [`supabase/picks_rls_fix.sql`](/Users/naassom/Downloads/ufc-fantasy%202/supabase/picks_rls_fix.sql), [`supabase/security_hardening.sql`](/Users/naassom/Downloads/ufc-fantasy%202/supabase/security_hardening.sql) e [`supabase/picks_delete_trigger_fix.sql`](/Users/naassom/Downloads/ufc-fantasy%202/supabase/picks_delete_trigger_fix.sql): patches pontuais para projetos já existentes

### Projeto novo

Se o banco estiver vazio, você pode usar o schema base como ponto de partida:

```sql
-- rode o conteúdo de schema.sql
```

### Projeto já existente

Se o projeto já está rodando e você quer aplicar as correções recentes, rode no SQL Editor do Supabase:

1. [`supabase/picks_rls_fix.sql`](/Users/naassom/Downloads/ufc-fantasy%202/supabase/picks_rls_fix.sql)
2. [`supabase/security_hardening.sql`](/Users/naassom/Downloads/ufc-fantasy%202/supabase/security_hardening.sql)
3. [`supabase/picks_delete_trigger_fix.sql`](/Users/naassom/Downloads/ufc-fantasy%202/supabase/picks_delete_trigger_fix.sql)

## Admin

Depois de criar seu usuário, promova-o a admin:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = 'SEU_USER_UUID';
```

## Verificação automática do card

O endpoint `GET|POST /api/cron/card-verification` verifica eventos em T-72h e
T-18h antes de `picks_lock_at`. Ele usa UFC.com como fonte principal, Sherdog
como tira-teima e registra a disponibilidade do UFCStats.

- Rode a migration `supabase/migrations/20260603203000_card_verification_runs.sql`.
- Configure um job externo para chamar o endpoint uma vez por hora.
- Envie `Authorization: Bearer <SYNC_SECRET>`.
- T-18h remove lutas somente quando UFC.com e Sherdog concordam; se uma fonte
  estiver indisponível, a execução gera alerta e não altera o card.
- Alterações em massa geram uma única notificação, apenas quando o evento é o atual.

## Segurança

O projeto foi endurecido para reduzir risco de vazamento e abuso:

- Rotas administrativas exigem sessão autenticada, role `admin` e bloqueio de usuário banido
- RLS em `picks` impede edição fora da janela permitida e protege campos sensíveis
- `profiles` deixa de ser público para uso geral; ranking usa uma view com campos mínimos
- Callback de auth sanitiza redirects internos
- Scrapers admin aceitam apenas hosts permitidos
- Middleware adiciona headers como `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`

Isso melhora bastante a segurança prática do app, mas não substitui operação de produção responsável: rotação de segredos, monitoramento, backups, política de privacidade e revisão jurídica quando aplicável.

## Estrutura

```text
src/
  app/
  components/
  lib/
  types/
supabase/
  migrations/
  picks_rls_fix.sql
  picks_delete_trigger_fix.sql
  security_hardening.sql
schema.sql
```

## Scripts

```bash
npm run dev
npm run build
npm run start
```

## Observações

- Não commite `.env.local` nem chaves do Supabase
- Se algum segredo já foi exposto, rotacione no painel do provedor
- Este projeto não possui vínculo oficial com o UFC

## Licença

MIT. Veja [`LICENSE`](/Users/naassom/Downloads/ufc-fantasy%202/LICENSE).
