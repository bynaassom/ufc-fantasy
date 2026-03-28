# 🥊 UFC Fantasy App

Plataforma de fantasy para eventos do UFC — faça seus picks e compita com amigos.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Estilo**: Tailwind CSS + CSS Variables (dark/light mode)
- **Banco de dados**: Supabase (PostgreSQL + Auth + RLS)
- **Hospedagem**: Vercel (recomendado)
- **Fonte**: Encode Sans
- **Ícones**: Streamline Sharp Line Free

---

## ⚙️ Setup — Passo a passo

### 1. Clonar e instalar

```bash
npm install
```

### 2. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** e rode o arquivo `supabase/schema.sql` completo
3. Anote as credenciais: `Project URL` e `anon key` (Settings > API)

### 3. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  (Settings > API > service_role)
```

### 4. Criar seu usuário admin

1. Registre-se normalmente no app
2. No Supabase, vá em **Table Editor > profiles**
3. Encontre seu usuário e mude `role` para `admin`

Ou via SQL:
```sql
UPDATE profiles SET role = 'admin' WHERE nickname = 'SeuNick';
```

### 5. Rodar localmente

```bash
npm run dev
```

### 6. Deploy no Vercel

```bash
# Instale o CLI do Vercel
npm i -g vercel

# Deploy
vercel

# Configure as env vars no dashboard do Vercel
```

---

## 🖼️ Configurar o banner da landing page

Edite `src/app/page.tsx` e substitua:
```typescript
const EVENT_BANNER_URL = "https://SUA-URL-AQUI/banner.jpg";
```

Sites free para hospedar imagens: **Imgur**, **Cloudinary** (free tier), **ImgBB**

---

## 🏟️ Criar um evento (admin)

1. Acesse `/admin` com sua conta admin
2. Aba "Eventos" → "Novo Evento"
3. Preencha nome, slug, data/hora, localização
4. Adicione as lutas com os lutadores

**Importante**: O slug vira a URL do evento. Ex: `ufc-300` → `/event/ufc-300`

---

## ⚔️ Adicionar lutadores

Você pode adicionar lutadores diretamente na tabela `fighters` do Supabase:

```sql
INSERT INTO fighters (name, headshot_url, country) VALUES
  ('Jon Jones', 'https://...headshot.jpg', 'EUA'),
  ('Stipe Miocic', 'https://...headshot.jpg', 'EUA');
```

Os headshots podem ser URLs diretas das imagens do UFC ou qualquer CDN público.

---

## 🎯 Sistema de pontuação

| Acerto | Pontos |
|--------|--------|
| Vencedor correto | +1 |
| Método correto (+ vencedor correto) | +1 |
| Round correto (+ método + vencedor corretos) | +1 |
| **Máximo por luta** | **3** |

---

## 🔒 Segurança do banco (RLS)

- Usuários só podem criar/editar **seus próprios picks**
- Picks são **bloqueados automaticamente** 30 minutos antes do evento
- Um trigger no banco **impede qualquer modificação** após o lock, mesmo via API
- Picks confirmados **não podem ter pontos alterados pelo usuário**
- Atividade suspeita (muitos picks em pouco tempo) é **logada automaticamente**
- Usuários banidos **não podem criar picks**
- A função `score_picks_for_fight` só pode ser chamada pelo **service role**

---

## 📱 Páginas

| Rota | Descrição |
|------|-----------|
| `/` | Landing page |
| `/login` | Login |
| `/register` | Registro |
| `/home` | Lista de eventos |
| `/event/[slug]` | Picks do evento |
| `/ranking` | Ranking geral e por evento |
| `/admin` | Painel administrativo |

---

## 🚀 Supabase Free Tier — Limites

- **50.000 MAU** (usuários ativos/mês) — mais que suficiente para 150 pessoas
- **500MB** de banco de dados
- **5GB** de bandwidth
- Auth incluso

Para 150 usuários, o free tier do Supabase é mais que suficiente.

---

## 📦 Estrutura do projeto

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/                # Login
│   ├── register/             # Registro
│   ├── home/                 # Home com eventos
│   ├── event/[slug]/         # Picks do evento
│   ├── ranking/              # Ranking
│   ├── admin/                # Painel admin
│   └── api/results/score/    # API de pontuação
├── components/
│   ├── layout/Navbar.tsx     # Navegação
│   ├── ui/ThemeToggle.tsx    # Toggle dark/light
│   ├── event/
│   │   ├── FightCard.tsx     # Card de luta com picks
│   │   └── EventPicksClient.tsx
│   └── admin/AdminClient.tsx # Painel admin
├── lib/
│   ├── supabase/             # Clientes Supabase
│   ├── ufc-api.ts            # Integração API UFC
│   └── utils.ts              # Utilitários
└── types/index.ts            # TypeScript types
```
