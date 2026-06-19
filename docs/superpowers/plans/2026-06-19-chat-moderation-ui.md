# Chat Moderation UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin chat moderation: list all messages (including hidden), hide/unhide messages, and ban users with a reason — all audited.

**Architecture:** Extend the existing chat repository (`listAllMessages` + `unhideMessage`), chat service layer (`unhideChatMessage` + `getAdminChatMessages`), ban mechanism (`updateProfileBan` with reason + audit logging), and admin client (new `ChatModerationTab` component wired into AdminClient). No new tables; `chat_messages.is_hidden` and `profiles.ban_reason` already exist.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Supabase, Zod, vitest

## Global Constraints

- Auth: All admin APIs use `requireAdmin()` guard. All mutations use `assertSameOriginForMutation()`.
- Audit: Every moderation action (hide, unhide, ban, unban) logs to `activity_logs` via `logAdminAction()`.
- Chat moderation columns: `is_hidden` (boolean), `hidden_by` (UUID), `hidden_at` (timestamptz) already exist; no schema changes needed.
- Ban reason: `profiles.ban_reason TEXT` column must exist (safe migration creates if missing).
- Copy/UX: Pt-BR, dark theme with red accents, existing admin tab styling.
- API pattern: `export const dynamic = "force-dynamic"`, `apiSuccess`/`apiErrorFromUnknown`, Zod body validation.

---

### Task 1: Migration — Ensure ban_reason column exists

**Files:**
- Create: `supabase/migrations/20260619000000_ensure_ban_reason.sql`
- No test (migration is self-verifying with IF NOT EXISTS)

**Interfaces:**
- Produces: `profiles.ban_reason TEXT` column guaranteed in DB

- [ ] **Step 1: Create the migration file**

```sql
-- Ensure ban_reason column exists on profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
  END IF;
END $$;

-- index for admin chat message queries filtered by is_hidden
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_hidden
  ON chat_messages(is_hidden, created_at DESC)
  WHERE is_hidden = true;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260619000000_ensure_ban_reason.sql
git commit -m "feat: add ban_reason column guard and chat moderation index"
```

---

### Task 2: Ban with reason — schema, repo, service, API, logging

**Files:**
- Modify: `src/server/validators/admin.ts:80-82` — extend `adminBanToggleSchema`
- Modify: `src/server/repositories/profiles.ts:72-86` — `updateProfileBan` accepts reason
- Modify: `src/server/services/app.ts:2183-2187` — `toggleAdminUserBan` passes reason, logs audit
- Modify: `src/app/api/admin/users/[userId]/ban/route.ts:22` — passes `body.reason`
- Test: `tests/unit/validators.test.ts` — new test cases

**Interfaces:**
- Consumes: `logAdminAction` from `@/lib/admin-audit`
- Produces: `adminBanToggleSchema` now accepts `{ currentBan: boolean, reason?: string }`
- Produces: `updateProfileBan(client, userId, isBanned, reason?)` — stores `ban_reason` when provided
- Produces: `toggleAdminUserBan(userId, currentBan, reason?)` — logs audit with reason

- [ ] **Step 1: Write the failing validator test**

```typescript
// tests/unit/validators.test.ts — add these at end of file, inside describe("validators", () => {
  it("accepts ban payload with reason", () => {
    const result = adminBanToggleSchema.safeParse({
      currentBan: false,
      reason: "Spam no chat",
    });

    expect(result.success).toBe(true);
  });

  it("accepts ban payload without reason", () => {
    const result = adminBanToggleSchema.safeParse({ currentBan: true });

    expect(result.success).toBe(true);
  });
```

Run: `npx vitest run tests/unit/validators.test.ts -t "accepts ban payload with reason"`
Expected: FAIL — `"Unrecognized key(s) in object: 'reason'"` (if Zod strict)

- [ ] **Step 2: Update adminBanToggleSchema to accept optional reason**

```typescript
// src/server/validators/admin.ts:80-82 — replace existing
export const adminBanToggleSchema = z.object({
  currentBan: z.boolean(),
  reason: z.string().max(500).optional(),
});
```

- [ ] **Step 3: Run validator tests to verify pass**

Run: `npx vitest run tests/unit/validators.test.ts`
Expected: All tests PASS, including two new ban tests

- [ ] **Step 4: Update updateProfileBan to store ban_reason**

```typescript
// src/server/repositories/profiles.ts:72-86 — replace existing function
export async function updateProfileBan(
  client: DbClient,
  userId: string,
  isBanned: boolean,
  reason?: string,
) {
  const payload: Record<string, unknown> = { is_banned: isBanned };
  if (reason !== undefined) payload.ban_reason = reason;
  if (!isBanned) payload.ban_reason = null; // clear reason on unban
  const { data, error } = await client
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
```

- [ ] **Step 5: Update toggleAdminUserBan with audit logging + reason**

```typescript
// src/server/services/app.ts:2183-2187 — replace existing function
export async function toggleAdminUserBan(
  userId: string,
  currentBan: boolean,
  reason?: string,
) {
  const { adminSupabase, user } = await requireAdmin();
  const profile = await updateProfileBan(adminSupabase, userId, !currentBan, reason);
  await logAdminAction(adminSupabase, {
    userId: user.id,
    action: currentBan ? "admin_unban_user" : "admin_ban_user",
    details: { targetUserId: userId, reason: reason || null },
    suspicious: false,
  });
  return { profile, isBanned: !currentBan };
}
```

Add the import at top of `src/server/services/app.ts` (near line 19):
```typescript
import { logAdminAction } from "@/lib/admin-audit";
```

- [ ] **Step 6: Update ban API route to pass reason**

```typescript
// src/app/api/admin/users/[userId]/ban/route.ts:22-23 — replace toggle call
    const data = await toggleAdminUserBan(
      params.userId,
      body.currentBan,
      body.reason,
    );
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/server/validators/admin.ts src/server/repositories/profiles.ts src/server/services/app.ts src/app/api/admin/users/\[userId\]/ban/route.ts tests/unit/validators.test.ts
git commit -m "feat: ban with reason, audit logging for ban/unban"
```

---

### Task 3: Chat unhide — repo + service + API

**Files:**
- Modify: `src/server/repositories/chat.ts` — add `unhideMessage`
- Modify: `src/server/services/chat.ts` — add `unhideChatMessage`
- Create: `src/app/api/chat/[id]/unhide/route.ts`
- No test (thin passthrough; tested via integration)

**Interfaces:**
- Produces: `unhideMessage(client, messageId)` — sets `is_hidden=false, hidden_by=null, hidden_at=null`
- Produces: `unhideChatMessage(messageId)` — admin guard + repo call

- [ ] **Step 1: Add unhideMessage to chat repository**

```typescript
// src/server/repositories/chat.ts — add after hideMessage (line 107)
export async function unhideMessage(
  client: any,
  messageId: string,
): Promise<void> {
  const { error } = await client
    .from("chat_messages")
    .update({
      is_hidden: false,
      hidden_by: null,
      hidden_at: null,
    })
    .eq("id", messageId);

  if (error) throw error;
}
```

- [ ] **Step 2: Add unhideChatMessage to chat service**

```typescript
// src/server/services/chat.ts — add after hideChatMessage (line 39)
import { unhideMessage } from "@/server/repositories/chat";

export async function unhideChatMessage(
  messageId: string,
): Promise<void> {
  const { adminSupabase } = await requireAdmin();
  return unhideMessage(adminSupabase, messageId);
}
```

- [ ] **Step 3: Create unhide API route**

```typescript
// src/app/api/chat/[id]/unhide/route.ts
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
} from "@/server/api";
import { unhideChatMessage } from "@/server/services/chat";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    assertSameOriginForMutation(request);
    await unhideChatMessage(params.id);
    return apiSuccess({ hidden: false });
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/server/repositories/chat.ts src/server/services/chat.ts src/app/api/chat/\[id\]/unhide/route.ts
git commit -m "feat: unhide chat message endpoint (admin)"
```

---

### Task 4: Admin chat message list — repo + service + API

**Files:**
- Modify: `src/server/repositories/chat.ts` — add `listAllMessages`
- Modify: `src/server/services/chat.ts` — add `getAdminChatMessages`
- Create: `src/app/api/admin/chat/messages/route.ts`
- No test (thin passthrough; tested via integration)

**Interfaces:**
- Produces: `listAllMessages(client, limit?, beforeCreatedAt?, groupId?, showHidden?)` — returns `{ messages: ChatMessage[], hasMore: boolean }`
- Produces: `getAdminChatMessages(beforeCreatedAt?, groupId?, showHidden?)` — admin guard + repo call

- [ ] **Step 1: Add listAllMessages to chat repository**

```typescript
// src/server/repositories/chat.ts — add after unhideMessage
export async function listAllMessages(
  client: any,
  limit = 50,
  beforeCreatedAt?: string | null,
  groupId?: string | null,
  showHidden?: boolean | null,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  let query = client
    .from("chat_messages")
    .select(MESSAGE_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (beforeCreatedAt) {
    query = query.lt("created_at", beforeCreatedAt);
  }

  if (groupId) {
    query = query.eq("group_id", groupId);
  }

  // by default, only show visible messages unless showHidden is explicitly set
  if (showHidden) {
    query = query.eq("is_hidden", true);
  } else if (showHidden === false) {
    query = query.eq("is_hidden", false);
  }

  const { data, error } = await query;

  if (error) throw error;

  const messages = (data || []) as ChatMessage[];
  const hasMore = messages.length > limit;

  return {
    messages: hasMore ? messages.slice(0, limit) : messages,
    hasMore,
  };
}
```

- [ ] **Step 2: Add getAdminChatMessages to chat service**

```typescript
// src/server/services/chat.ts — add after unhideChatMessage
import { listAllMessages } from "@/server/repositories/chat";

export async function getAdminChatMessages(
  beforeCreatedAt?: string | null,
  groupId?: string | null,
  showHidden?: boolean | null,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const { adminSupabase } = await requireAdmin();
  return listAllMessages(adminSupabase, 50, beforeCreatedAt, groupId, showHidden);
}
```

- [ ] **Step 3: Create admin chat messages API route**

```typescript
// src/app/api/admin/chat/messages/route.ts
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { getAdminChatMessages } from "@/server/services/chat";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    const groupId = searchParams.get("groupId");
    const hidden = searchParams.get("hidden"); // "true" | "false" | null (all)
    const showHidden = hidden === "true" ? true : hidden === "false" ? false : null;
    const data = await getAdminChatMessages(
      before || null,
      groupId || null,
      showHidden,
    );
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/server/repositories/chat.ts src/server/services/chat.ts src/app/api/admin/chat/messages/route.ts
git commit -m "feat: admin chat message list API"
```

---

### Task 5: ChatModerationTab admin component

**Files:**
- Create: `src/components/admin/tabs/ChatModerationTab.tsx`
- Modify: `src/components/admin/types.ts` — add `chat-moderacao` SubTab
- Modify: `src/components/admin/AdminClient.tsx` — add nav entry + rendering
- No test (UI component; tested via manual verification)

**Interfaces:**
- Consumes: `adminGet`, `adminSend`, `formatAdminDateTime` from `../shared`
- Consumes: `GET /api/admin/chat/messages?before=&hidden=`
- Consumes: `DELETE /api/chat/:id` (hide)
- Consumes: `POST /api/chat/:id/unhide` (unhide)
- Consumes: `POST /api/admin/users/:userId/ban` (ban with reason)

- [ ] **Step 1: Create ChatModerationTab component**

```typescript
// src/components/admin/tabs/ChatModerationTab.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { adminGet, adminSend, formatAdminDateTime } from "../shared";

interface ChatMessage {
  id: string;
  user_id: string;
  group_id?: string | null;
  content: string;
  is_hidden: boolean;
  hidden_by?: string | null;
  hidden_at?: string | null;
  created_at: string;
  profile?: {
    nickname: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

type FilterMode = "all" | "visible" | "hidden";

export default function ChatModerationTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [oldestTs, setOldestTs] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const reasonInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(
    async (before?: string | null, reset = false) => {
      setLoading(true);
      try {
        const hidden =
          filter === "hidden" ? "true" : filter === "visible" ? "false" : null;
        const params = new URLSearchParams();
        if (before) params.set("before", before);
        if (hidden) params.set("hidden", hidden);
        const qs = params.toString();
        const data = await adminGet<{
          messages: ChatMessage[];
          hasMore: boolean;
        }>(`/api/admin/chat/messages${qs ? `?${qs}` : ""}`);
        setMessages((prev) =>
          reset
            ? data.messages
            : [...prev, ...data.messages].filter(
                (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i,
              ),
        );
        setHasMore(data.hasMore);
        if (data.messages.length > 0) {
          const last = data.messages[data.messages.length - 1];
          setOldestTs(last.created_at);
        } else {
          setOldestTs(null);
        }
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    fetchMessages(null, true);
  }, [fetchMessages]);

  async function hideMsg(messageId: string) {
    setActionLoading(messageId);
    try {
      await adminSend(`/api/chat/${messageId}`, { method: "DELETE" });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_hidden: true } : m,
        ),
      );
      toast.success("Mensagem ocultada.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function unhideMsg(messageId: string) {
    setActionLoading(messageId);
    try {
      await adminSend(`/api/chat/${messageId}/unhide`, { method: "POST" });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_hidden: false } : m,
        ),
      );
      toast.success("Mensagem reexibida.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function banUser(userId: string) {
    if (!banReason.trim()) {
      toast.error("Informe o motivo do banimento.");
      return;
    }
    setActionLoading(`ban-${userId}`);
    try {
      await adminSend(`/api/admin/users/${userId}/ban`, {
        method: "POST",
        body: JSON.stringify({ currentBan: false, reason: banReason }),
      });
      toast.success("Usuário banido.");
      setBanUserId(null);
      setBanReason("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  const nickLabel = (m: ChatMessage) =>
    m.profile
      ? `${m.profile.nickname}${m.profile.role === "admin" ? " ⚡" : ""}`
      : "ex-usuario";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(["all", "visible", "hidden"] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="font-condensed font-700 text-xs uppercase tracking-widest px-4 py-2 transition-all"
              style={{
                border: "1px solid var(--border)",
                backgroundColor:
                  filter === f ? "var(--red)" : "var(--bg-elevated)",
                color: filter === f ? "#000" : "var(--text-muted)",
              }}
            >
              {f === "all" ? "Todas" : f === "visible" ? "Visiveis" : "Ocultas"}
            </button>
          ))}
        </div>
        {loading && (
          <span
            className="font-condensed text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Carregando...
          </span>
        )}
      </div>

      {messages.length === 0 && !loading ? (
        <p style={{ color: "var(--text-muted)" }}>Nenhuma mensagem encontrada.</p>
      ) : (
        <div>
          {messages.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-2 px-4 py-3"
              style={{
                borderBottom: "1px solid var(--border-light)",
                opacity: m.is_hidden ? 0.6 : 1,
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="font-condensed font-900 text-sm uppercase"
                    style={{
                      color:
                        m.profile?.role === "admin"
                          ? "var(--red)"
                          : "var(--text)",
                    }}
                  >
                    {nickLabel(m)}
                  </span>
                  {m.is_hidden && (
                    <span
                      className="font-condensed text-xs uppercase tracking-widest px-2 py-0.5"
                      style={{
                        backgroundColor: "rgba(239,68,68,0.15)",
                        color: "var(--red)",
                      }}
                    >
                      Ocultada
                    </span>
                  )}
                  {m.group_id && (
                    <span
                      className="font-condensed text-xs uppercase tracking-widest"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Liga
                    </span>
                  )}
                </div>
                <span
                  className="font-condensed text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatAdminDateTime(m.created_at)}
                </span>
              </div>

              <p
                className="text-sm"
                style={{
                  color: "var(--text)",
                  wordBreak: "break-word",
                }}
              >
                {m.content}
              </p>

              <div className="flex items-center gap-3">
                {m.is_hidden ? (
                  <button
                    onClick={() => unhideMsg(m.id)}
                    disabled={actionLoading === m.id}
                    className="font-condensed text-xs uppercase tracking-widest px-3 py-1.5 transition-all"
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--bg-elevated)",
                      color: "var(--text)",
                      opacity: actionLoading === m.id ? 0.5 : 1,
                    }}
                  >
                    Reexibir
                  </button>
                ) : (
                  <button
                    onClick={() => hideMsg(m.id)}
                    disabled={actionLoading === m.id}
                    className="font-condensed text-xs uppercase tracking-widest px-3 py-1.5 transition-all"
                    style={{
                      border: "1px solid var(--red)",
                      backgroundColor: "transparent",
                      color: "var(--red)",
                      opacity: actionLoading === m.id ? 0.5 : 1,
                    }}
                  >
                    Ocultar
                  </button>
                )}
                <button
                  onClick={() =>
                    setBanUserId(banUserId === m.user_id ? null : m.user_id)
                  }
                  disabled={actionLoading === `ban-${m.user_id}`}
                  className="font-condensed text-xs uppercase tracking-widest px-3 py-1.5 transition-all"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-elevated)",
                    color: "var(--text-muted)",
                    opacity: actionLoading === `ban-${m.user_id}` ? 0.5 : 1,
                  }}
                >
                  Banir
                </button>
              </div>

              {banUserId === m.user_id && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    ref={reasonInputRef}
                    type="text"
                    placeholder="Motivo do ban..."
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") banUser(m.user_id);
                    }}
                    className="flex-1 px-3 py-2 text-sm"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => banUser(m.user_id)}
                    className="font-condensed text-xs uppercase tracking-widest px-4 py-2 transition-all"
                    style={{
                      border: "1px solid var(--red)",
                      backgroundColor: "var(--red)",
                      color: "#000",
                    }}
                  >
                    Confirmar
                  </button>
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center py-4">
              <button
                onClick={() => fetchMessages(oldestTs)}
                disabled={loading}
                className="font-condensed text-xs uppercase tracking-widest px-6 py-2 transition-all"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text)",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? "Carregando..." : "Carregar mais"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add type to admin types**

```typescript
// src/components/admin/types.ts:3 — add at end of SubTab union
  | "chat-moderacao";
```

- [ ] **Step 3: Wire into AdminClient**

In `src/components/admin/AdminClient.tsx`:

Add import (near line 18, after the other tab imports):
```typescript
import ChatModerationTab from "./tabs/ChatModerationTab";
```

Add nav entry (inside the `nav` array, before `usuarios`):
```typescript
    { key: "chat" as MainTab, label: "CHAT", subs: [
      { key: "chat-moderacao", label: "Moderacao" },
    ]},
```

But wait — `MainTab` doesn't include `"chat"`. We need to add it to the type:

```typescript
// src/components/admin/types.ts:1 — add "chat" to MainTab
export type MainTab =
  "eventos" | "lutas" | "resultados" | "operacoes" | "badges" | "analytics" | "usuarios" | "chat";
```

Add rendering (after line 175 `{subTab === "analytics" && <AnalyticsTab />}`):
```typescript
      {subTab === "chat-moderacao" && <ChatModerationTab />}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/tabs/ChatModerationTab.tsx src/components/admin/types.ts src/components/admin/AdminClient.tsx
git commit -m "feat: chat moderation admin tab"
```

---

### Task 6: Update UsersTab to show ban reason input

**Files:**
- Modify: `src/components/admin/tabs/UsersTab.tsx` — add reason input to ban toggle

**Interfaces:**
- Consumes: updated `POST /api/admin/users/:userId/ban` with optional `reason`

- [ ] **Step 1: Update toggleBan in UsersTab to accept and send reason**

```typescript
// src/components/admin/tabs/UsersTab.tsx:40-57 — replace toggleBan and add state
function Usuarios({ userList, setUserList }: any) {
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");

  async function toggleBan(userId: string, currentBan: boolean, reason?: string) {
    try {
      await adminSend(`/api/admin/users/${userId}/ban`, {
        method: "POST",
        body: JSON.stringify({ currentBan, reason }),
      });
    } catch (error: any) {
      toast.error(error.message);
      return;
    }
    setUserList((u: any[]) =>
      u.map((p: any) =>
        p.id === userId
          ? { ...p, is_banned: !currentBan, ban_reason: reason || null }
          : p,
      ),
    );
    toast.success(currentBan ? "Usuario desbanido." : "Usuario banido.");
    setBanTargetId(null);
    setBanReason("");
  }
```

Replace the existing ban button JSX (the Action column) — find the existing button in the user list row. Currently around lines 130-160 of UsersTab.tsx. The existing code looks like:

```typescript
<button onClick={() => toggleBan(u.id, u.is_banned)}>
  {u.is_banned ? "Desbanir" : "Banir"}
</button>
```

We need to add an inline reason input. Replace the button with:

```typescript
{banTargetId === u.id ? (
  <div className="col-span-2 flex gap-2">
    <input
      type="text"
      placeholder="Motivo..."
      value={banReason}
      onChange={(e) => setBanReason(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") toggleBan(u.id, u.is_banned, banReason || undefined);
      }}
      style={{
        ...(inp as React.CSSProperties),
        padding: "4px 8px",
        fontSize: "12px",
      }}
    />
    <button onClick={() => toggleBan(u.id, u.is_banned, banReason || undefined)}>
      OK
    </button>
  </div>
) : (
  <button
    onClick={() => {
      if (u.is_banned) {
        toggleBan(u.id, u.is_banned);
      } else {
        setBanTargetId(banTargetId === u.id ? null : u.id);
        setBanReason("");
      }
    }}
  >
    {u.is_banned ? "Desbanir" : "Banir"}
  </button>
)}
```

Note: The exact column layout of the action button needs to match the grid. Let me provide the correct insertion point. The existing User row has grid columns for nickname, name, pts, role, action. The action button is in a `col-span-2` div. The replacement should use the same grid column placement.

To find the exact lines, look for `{u.is_banned ? "Desbanir" : "Banir"}` in `UsersTab.tsx`. Replace that button element and its parent div with the conditional above.

- [ ] **Step 2: Add required imports to UsersTab**

At the top of `UsersTab.tsx`, ensure `useState` is imported (it already is — check line 3). Also add `useRef` import if not present.

```typescript
// src/components/admin/tabs/UsersTab.tsx:3 — if useState is missing, add it
import { useEffect, useMemo, useState, useDeferredValue } from "react";
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/tabs/UsersTab.tsx
git commit -m "feat: ban reason input in UsersTab"
```

---

### Final Verification

- [ ] Run `npx tsc --noEmit` — must pass
- [ ] Run `npx vitest run` — all tests pass
- [ ] Run `npm run build` — builds successfully
- [ ] Commit any remaining changes
