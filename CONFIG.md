# Configuração do Ambiente — UFC Fantasy

## 1. Variáveis de Ambiente (`.env.local`)

Copie `.env.example` para `.env.local` e preencha:

```env
# ── Supabase ──────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── Web Push (VAPID) ────────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:seu-email@exemplo.com

# ── Cron Secrets (cron-job.org) ─────────────────────
NOTIFICATIONS_CRON_SECRET=
SYNC_SECRET=

# ── App ──────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Onde conseguir cada valor

| Variável | Onde obter |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` key (⚠️ secreta — nunca no cliente) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Gerar com `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | Um e-mail ou `mailto:` para contacto |
| `NOTIFICATIONS_CRON_SECRET` / `SYNC_SECRET` | Gerar com `openssl rand -hex 32` (devem ser diferentes entre si) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` em dev, URL de produção em prod |

---

## 2. Supabase — Setup do Banco

### 2.1. Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e crie um projeto.
2. Vá para **SQL Editor**.
3. Cole e execute o conteúdo de `schema.sql` (ou o arquivo de migração em `supabase/migrations/`).

### 2.2. Autenticação

1. Vá para **Authentication → Settings**.
2. Em **Site URL**, coloque `NEXT_PUBLIC_APP_URL`.
3. Em **Redirect URLs**, adicione:
   - `http://localhost:3000/auth/callback`
   - `https://seudominio.com/auth/callback`
4. Habilite os provedores desejados (email, Google, etc.).

### 2.3. RLS (Row-Level Security)

As políticas RLS estão definidas nas migrations. Os pontos principais:

- A **`service_role` key** (usada por `createAdminClient`) **bypassa todas as RLS**. Só use em server-only (rotas API, cron, server components).
- A **`anon` key** (usada pelo cliente browser) só acessa o que as RLS permitem (leitura pública de eventos, fighters, etc.).
- A tabela `push_subscriptions` usa `(SELECT id FROM profiles WHERE auth_user_id = auth.uid())` para associar subscrições ao profile correto.

### 2.4. Views (ranking_profiles)

```sql
CREATE VIEW ranking_profiles AS
SELECT
  id, nickname, first_name, last_name,
  total_points, division, role,
  auth_user_id
FROM profiles
WHERE NOT is_banned;
```

---

## 3. Web Push (Notificações Push)

### Gerar chaves VAPID

```bash
npx web-push generate-vapid-keys
```

Cole os valores em:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (cliente + servidor)
- `VAPID_PRIVATE_KEY` (apenas servidor)
- `VAPID_SUBJECT` (e-mail do responsável)

As notificações usam o Service Worker em `public/sw.js`.

---

## 4. Cron Jobs (cron-job.org)

Crie uma conta em [cron-job.org](https://cron-job.org) e configure os seguintes jobs:

### 4.1. Sincronizar Eventos (diário)

| Campo | Valor |
|-------|-------|
| **URL** | `https://seudominio.com/api/sync-events` |
| **Method** | `POST` |
| **Headers** | `x-cron-secret: SYNC_SECRET` |
| **Schedule** | `0 8 * * *` (08:00 UTC) |
| **Payload** | (vazio) |

### 4.2. Verificar Resultados (contínuo durante eventos)

| Campo | Valor |
|-------|-------|
| **URL** | `https://seudominio.com/api/sync-results` |
| **Method** | `POST` |
| **Headers** | `x-cron-secret: SYNC_SECRET` |
| **Schedule** | `*/15 * * * *` (a cada 15 min) |

### 4.3. Disparar Notificações (horário comercial)

| Campo | Valor |
|-------|-------|
| **URL** | `https://seudominio.com/api/cron/notifications` |
| **Method** | `POST` |
| **Headers** | `x-cron-secret: NOTIFICATIONS_CRON_SECRET` |
| **Schedule** | `0 10,14,18 * * 1-5` (10h, 14h, 18h UTC, seg-sex) |

### 4.4. Verificar Card (antes do evento)

| Campo | Valor |
|-------|-------|
| **URL** | `https://seudominio.com/api/cron/card-verification` |
| **Method** | `POST` |
| **Headers** | `x-cron-secret: SYNC_SECRET` |
| **Schedule** | `0 */6 * * *` (a cada 6h) |

### Payload dos CRONs

Todos os endpoints esperam `POST` com `Content-Type: application/json` e body opcional (`{}`). A proteção é feita pelo header `x-cron-secret`.

---

## 5. Odds (Opcional)

O scraping de odds em `src/lib/card-verification.ts` usa sites públicos (UFC Stats, Sherdog). Nenhuma API key necessária.

---

## 6. Rate Limiting

A configuração padrão está em `src/lib/rate-limiter.ts`:

- **60 requisições por minuto** por IP para rotas `/api/*` em geral.
- **20 requisições por minuto** por IP para `/api/events/*/picks` e `/api/challenges/*`.
- O rate limiter é **in-memory** e reseta ao reiniciar o servidor.

Para produção com múltiplas instâncias, substitua por Redis/Vercel KV.

---

## 7. Verificação Final

```bash
npm run build    # deve compilar sem erros
npm run dev      # deve rodar em http://localhost:3000
```

Teste manual:
- [ ] Login/Registro com email
- [ ] Home mostra evento atual
- [ ] Picks funcionam (selecionar lutador, submeter)
- [ ] Ranking carrega
- [ ] Desafios (criar, aceitar, ver detalhes)
- [ ] Alternar tema claro/escuro
- [ ] Responsivo em viewport mobile (320px-428px)
