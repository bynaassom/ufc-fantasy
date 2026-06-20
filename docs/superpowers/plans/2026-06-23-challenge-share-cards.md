# Challenge Share Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shareable cards for challenge creation and results, reusing the existing share pipeline (server-rendered DOM → canvas capture → PNG/JPEG → share).

**Architecture:** New data fetcher in app.ts, new page route `/share/challenge/[id]`, new share card components reusing `ShareActions` for capture. No changes to the pipeline itself.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, vitest

## Global Constraints

- Reuse existing `ShareActions` component for capture — no changes to the pipeline.
- No new DB tables. Read from existing `challenges` + `profiles` + `events`.
- Public access to `/share/challenge/[id]` (no auth).
- Pt-BR, dark theme, red accents, CSS variables.
- Follow existing share page patterns (`/share/picks`, `/share/event`).

---

### Task 1: Data fetcher + page route + types

**Files:**
- Modify: `src/types/index.ts` (add `ChallengeShareData`)
- Modify: `src/server/services/app.ts` (add `getPublicChallengeShareData`)
- Create: `src/app/share/challenge/[id]/page.tsx`

**Interfaces:**
- Produces: `ChallengeShareData` type
- Produces: `getPublicChallengeShareData(id)` → ChallengeShareData
- Produces: `GET /share/challenge/[id]` — server-rendered page

- [ ] **Step 1: Add type**

```typescript
// src/types/index.ts
export interface ChallengeShareData {
  id: string;
  challenger: { name: string; nickname: string };
  challenged: { name: string; nickname: string };
  eventName: string;
  eventDate: string;
  templateType: string | null;
  templateLabel: string | null;
  status: "pending" | "accepted" | "completed" | "declined";
  result?: {
    winnerId: string | null;
    winnerNickname: string | null;
    challengerScore: number;
    challengedScore: number;
    isDraw: boolean;
  };
}
```

- [ ] **Step 2: Add data fetcher to app.ts**

```typescript
// src/server/services/app.ts
export async function getPublicChallengeShareData(
  challengeId: string,
): Promise<ChallengeShareData | null> {
  const admin = await getAdminSupabase();

  const { data, error } = await admin
    .from("challenges")
    .select(`
      id,
      status,
      template_type,
      challenger:challenger_id(nickname, first_name, last_name),
      challenged:challenged_id(nickname, first_name, last_name),
      event:event_id(name, event_date)
    `)
    .eq("id", challengeId)
    .maybeSingle();

  if (error || !data) return null;

  const ch = data as any;
  const challengerName = ch.challenger
    ? [ch.challenger.first_name, ch.challenger.last_name].filter(Boolean).join(" ") || ch.challenger.nickname
    : "—";
  const challengedName = ch.challenged
    ? [ch.challenged.first_name, ch.challenged.last_name].filter(Boolean).join(" ") || ch.challenged.nickname
    : "—";

  const templateLabels: Record<string, string> = {
    beat_my_score: "Bater minha pontuação",
    more_winners: "Acerte mais vencedores",
    use_my_picks: "Use meus picks como gabarito",
  };

  const result = ch.status === "completed"
    ? await resolveChallengeShareResult(admin, challengeId)
    : undefined;

  return {
    id: ch.id,
    challenger: { name: challengerName, nickname: ch.challenger?.nickname || "—" },
    challenged: { name: challengedName, nickname: ch.challenged?.nickname || "—" },
    eventName: ch.event?.name || "—",
    eventDate: ch.event?.event_date || "",
    templateType: ch.template_type || null,
    templateLabel: ch.template_type ? templateLabels[ch.template_type] || null : null,
    status: ch.status,
    result,
  };
}

async function resolveChallengeShareResult(
  admin: any,
  challengeId: string,
): Promise<ChallengeShareData["result"]> {
  const { data } = await admin
    .from("challenges")
    .select("challenger_id, challenged_id, winner_id, result, event_id")
    .eq("id", challengeId)
    .maybeSingle();

  if (!data?.winner_id) return { winnerId: null, winnerNickname: null, challengerScore: 0, challengedScore: 0, isDraw: data?.result === "draw" };

  const isDraw = data.result === "draw";

  // Get scores from event_scores
  const { data: scores } = await admin
    .from("event_scores")
    .select("user_id, total_points")
    .eq("event_id", data.event_id)
    .in("user_id", [data.challenger_id, data.challenged_id]);

  const challengerScore = scores?.find((s: any) => s.user_id === data.challenger_id)?.total_points || 0;
  const challengedScore = scores?.find((s: any) => s.user_id === data.challenged_id)?.total_points || 0;

  return {
    winnerId: data.winner_id,
    winnerNickname: null, // resolved in the caller if needed
    challengerScore,
    challengedScore,
    isDraw,
  };
}
```

- [ ] **Step 3: Create page route**

Extend the `app.ts` export to include `getPublicChallengeShareData` in the page.

```typescript
// src/app/share/challenge/[id]/page.tsx
import { notFound } from "next/navigation";
import { getPublicChallengeShareData } from "@/server/services/app";
import ChallengeSharePage from "@/components/share/ChallengeSharePage";

export default async function ChallengeSharePageRoute({
  params,
}: {
  params: { id: string };
}) {
  const data = await getPublicChallengeShareData(params.id);
  if (!data) notFound();

  return <ChallengeSharePage data={data} />;
}
```

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add src/types/index.ts src/server/services/app.ts src/app/share/challenge/\[id\]/page.tsx
git commit -m "feat(share): challenge share data fetcher and page route"
```

---

### Task 2: Share card components + capture

**Files:**
- Create: `src/components/share/ChallengeShareCard.tsx`
- Create: `src/components/share/ChallengeSharePage.tsx`

**Interfaces:**
- Consumes: `ChallengeShareData`
- Produces: rendered DOM card (for ShareActions capture) + full page

- [ ] **Step 1: Create ChallengeShareCard (capturable DOM)**

```typescript
// src/components/share/ChallengeShareCard.tsx
import type { ChallengeShareData } from "@/types";

export default function ChallengeShareCard({
  data,
}: {
  data: ChallengeShareData;
}) {
  const isCompleted = data.status === "completed";
  const headerEmoji = isCompleted ? "🏆" : "⚔️";
  const headerText = isCompleted ? "DESAFIO COMPLETO" : "DESAFIO LANCADO";

  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        backgroundColor: "var(--bg)",
        padding: "24px",
        width: 540,
        minHeight: 400,
      }}
    >
      <span style={{ fontSize: 48 }}>{headerEmoji}</span>
      <h2
        className="font-condensed font-900 text-2xl uppercase mt-2"
        style={{ color: "var(--red)" }}
      >
        {headerText}
      </h2>

      <div className="mt-6">
        <p
          className="font-condensed font-700 text-lg"
          style={{ color: "var(--text)" }}
        >
          {isCompleted
            ? `${data.result!.challengerScore} × ${data.result!.challengedScore}`
            : `${data.challenger.nickname} desafiou ${data.challenged.nickname}`}
        </p>

        {isCompleted && !data.result!.isDraw && (
          <p
            className="font-condensed font-700 text-xl mt-1"
            style={{ color: "var(--red)" }}
          >
            {data.result!.winnerId === data.challenger.nickname
              ? data.challenger.nickname
              : data.challenged.nickname}{" "}
            venceu!
          </p>
        )}

        {isCompleted && data.result!.isDraw && (
          <p
            className="font-condensed font-700 text-xl mt-1"
            style={{ color: "var(--text)" }}
          >
            Empate!
          </p>
        )}

        <p
          className="font-condensed text-sm mt-2"
          style={{ color: "var(--text)" }}
        >
          {data.eventName}
        </p>
      </div>

      {data.templateLabel && (
        <div
          className="mt-6 px-6 py-3"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            border: "1px solid var(--red)",
          }}
        >
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--red)" }}
          >
            {data.templateLabel}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ChallengeSharePage (with ShareActions)**

```typescript
// src/components/share/ChallengeSharePage.tsx
"use client";

import { useRef } from "react";
import ChallengeShareCard from "@/components/share/ChallengeShareCard";
import ShareActions from "@/components/share/ShareActions";
import type { ChallengeShareData } from "@/types";

export default function ChallengeSharePage({
  data,
}: {
  data: ChallengeShareData;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const filename = `desafio-${data.challenger.nickname}-vs-${data.challenged.nickname}`;
  const shareCaption = `${data.challenger.nickname} × ${data.challenged.nickname} — ${data.eventName}`;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div
      className="min-h-screen flex flex-col items-center py-8"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      <div ref={cardRef}>
        <ChallengeShareCard data={data} />
      </div>
      <div className="mt-4">
        <ShareActions
          cardRef={cardRef}
          filename={filename}
          shareCaption={shareCaption}
          whatsappTextUrl={shareUrl}
        />
      </div>
    </div>
  );
}
```

Note: `ShareActions` props may differ from what's shown here. Read `src/components/share/ShareActions.tsx` to verify the exact prop interface and adjust accordingly.

- [ ] **Step 3: Read existing ShareActions to verify props**

Read `src/components/share/ShareActions.tsx` line 16 (the Props interface). Adjust `ChallengeSharePage.tsx` to pass the correct props. If ShareActions takes `bannerImageUrl` or `serverImageUrl`, pass appropriate values or empty strings.

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add src/components/share/ChallengeShareCard.tsx src/components/share/ChallengeSharePage.tsx
git commit -m "feat(share): challenge share card components with capture"
```

---

### Final Verification

- [ ] Run `npx tsc --noEmit`
- [ ] Run `npx vitest run`
- [ ] Run `npm run build`
