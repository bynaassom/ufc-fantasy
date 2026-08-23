# Configuração Do Ambiente — UFC Fantasy

## Variáveis De Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000

SYNC_SECRET=
NOTIFICATIONS_CRON_SECRET=
CRON_JOB_ORG_API_KEY=

NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:seu-email@exemplo.com
```

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon pública do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave server-only para rotas admin/cron |
| `NEXT_PUBLIC_APP_URL` | URL base do app |
| `SYNC_SECRET` | Protege sync de eventos, cards e resultados |
| `NOTIFICATIONS_CRON_SECRET` | Protege cron de notificações/ciclo |
| `CRON_JOB_ORG_API_KEY` | Cria, agenda e desativa automaticamente os jobs de resultados |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Chave pública Web Push |
| `VAPID_PRIVATE_KEY` | Chave privada Web Push server-only |
| `VAPID_SUBJECT` | E-mail/contato VAPID |

Gere segredos com:

```bash
openssl rand -hex 32
```

Gere VAPID com:

```bash
npx web-push generate-vapid-keys
```

## Supabase

1. Crie o projeto no Supabase.
2. Configure Authentication com `NEXT_PUBLIC_APP_URL` como Site URL.
3. Adicione redirect URLs:

```text
http://localhost:3000/auth/callback
https://seudominio.com/auth/callback
```

4. Aplique `schema.sql` para um banco vazio ou aplique as migrations em `supabase/migrations/` em ordem cronológica para bancos existentes.

## RLS E Views

- `createAdminClient()` usa `SUPABASE_SERVICE_ROLE_KEY` e bypassa RLS; use somente server-side.
- Clientes browser usam anon key e dependem das policies.
- `push_subscriptions.user_id` referencia o usuário/profile atual via `auth.uid()`.
- A view pública de ranking expõe apenas dados mínimos: `id`, `nickname`, `first_name`, `last_name`, `total_points`, `division`.

## Cron Jobs

Configure os jobs como `POST` e envie `Content-Type: application/json` com body `{}` ou vazio.

| Job | Endpoint | Header | Frequência sugerida |
| --- | --- | --- | --- |
| Eventos | `/api/cron/sync-events` | `Authorization: Bearer <SYNC_SECRET>` | Diário |
| Início dos resultados | `/api/cron/start-result-polling` | `Authorization: Bearer <SYNC_SECRET>` | Criado automaticamente no horário das preliminares |
| Resultados | `/api/sync-results` | `Authorization: Bearer <SYNC_SECRET>` | A cada 2 min, somente durante o evento |
| Notificações/ciclo | `/api/cron/notifications` | `Authorization: Bearer <NOTIFICATIONS_CRON_SECRET>` | A cada 5 min |
| Verificação do card | `/api/cron/card-verification` | `Authorization: Bearer <SYNC_SECRET>` | A cada 1h |

`/api/sync-events` continua existindo para uso admin/manual; para cron externo, prefira `/api/cron/sync-events`.
Os jobs são executados pelo cron-job.org; o plano Hobby da Vercel não é usado para agendamento.
Quando `CRON_JOB_ORG_API_KEY` está configurada, o sync diário de eventos cria ou atualiza um disparador para o horário das preliminares. Esse disparador ativa o job de resultados a cada 2 minutos; após o último resultado computado, o próprio app desativa o job. O job também expira após uma janela de segurança de 12 horas.
O job de notificações também limpa status antigos: após uma janela de segurança de 8 horas a partir do main card, eventos ainda marcados como `upcoming` ou `live` passam para `completed`.

## Odds

`POST /api/sync-odds` consulta a fonte oficial `https://www.ufc.com.br/fight-odds/{FightId}`. O `FightId` vem do card oficial e fica preservado no fragmento de `ufc_matchup_url`; nenhuma chave externa é necessária. Odds ainda não publicadas pelo UFC são ignoradas, sem apagar valores existentes.

## Rate Limiting

O rate limiter in-memory fica em `src/lib/rate-limiter.ts`.

- Limite padrão: 60 requisições/min por IP para APIs.
- Limite estrito: prefixes configurados no middleware/rate limiter, incluindo fluxos sensíveis como desafios e picks.
- Para múltiplas instâncias em produção, substitua por Redis/Vercel KV.

## Verificação Final

```bash
npx tsc --noEmit
npm run test
npm run build
```

Checklist manual:

- Login/registro e callback
- Home/evento atual
- Fluxo de picks
- Ranking geral/evento/temporada
- Ligas e convite
- Chat global e chat de liga
- Admin: eventos, lutas, resultados e logs
- PWA/mobile com safe area e navbar fixa
