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

NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:seu-email@exemplo.com

ODDS_API_KEY=
```

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon pública do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave server-only para rotas admin/cron |
| `NEXT_PUBLIC_APP_URL` | URL base do app |
| `SYNC_SECRET` | Protege sync de eventos, cards e resultados |
| `NOTIFICATIONS_CRON_SECRET` | Protege cron de notificações/ciclo |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Chave pública Web Push |
| `VAPID_PRIVATE_KEY` | Chave privada Web Push server-only |
| `VAPID_SUBJECT` | E-mail/contato VAPID |
| `ODDS_API_KEY` | Opcional, usada por `/api/sync-odds` |

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
| Resultados | `/api/sync-results` | `Authorization: Bearer <SYNC_SECRET>` | A cada 10 min durante eventos |
| Notificações/ciclo | `/api/cron/notifications` | `Authorization: Bearer <NOTIFICATIONS_CRON_SECRET>` | A cada 5 min |
| Verificação do card | `/api/cron/card-verification` | `Authorization: Bearer <SYNC_SECRET>` | A cada 1h |

`/api/sync-events` continua existindo para uso admin/manual; para cron externo, prefira `/api/cron/sync-events`.
Os jobs são executados pelo cron-job.org; o plano Hobby da Vercel não é usado para agendamento.

## Odds

`POST /api/sync-odds` usa `ODDS_API_KEY`. Sem essa variável, a sincronização de odds não deve ser considerada operacional.

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
