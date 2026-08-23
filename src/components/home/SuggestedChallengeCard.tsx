"use client";

import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { readApiResponse } from "@/lib/api";
import type { ChallengeResponse } from "@/types/api";
import type { SuggestedRival } from "@/types";

export default function SuggestedChallengeCard({ rivals, event }: { rivals: SuggestedRival[]; event: { id: string; name: string } | null }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rivalsKey = rivals.map((rival) => rival.userId).join(",");
  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, rivals.length - 1)));
    setOpen(false);
  }, [rivalsKey, rivals.length]);
  if (!event || !rivals.length) return null;
  const safeIndex = Math.min(index, rivals.length - 1);
  const rival = rivals[safeIndex];
  async function sendChallenge() {
    setLoading(true);
    try {
      await readApiResponse<ChallengeResponse>(await fetch("/api/challenges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengedId: rival.userId, eventId: event!.id, templateType: "classic" }) }));
      setOpen(false);
      toast.success("Desafio enviado!");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o desafio.");
    } finally { setLoading(false); }
  }
  return <>
    <div className="flex min-h-[76px] items-center justify-between gap-3 border-t-[3px] border-[var(--red)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-5">
      <div className="min-w-0"><div className="font-condensed text-[10px] font-900 uppercase tracking-[0.16em] text-[var(--red)]">Sugestão de rival</div><div className="mt-1 truncate font-condensed text-sm font-900 uppercase text-[var(--text)]">Desafie {rival.nickname}</div><div className="truncate text-xs text-[var(--text-secondary)]">{rival.reason}</div></div>
      <div className="flex shrink-0 items-center gap-2"><button type="button" className="min-tap max-w-[120px] border border-[var(--border)] px-2 font-condensed text-[10px] font-800 uppercase tracking-[0.1em] text-[var(--text-secondary)] disabled:opacity-50" onClick={() => setIndex((current) => Math.min(current + 1, rivals.length - 1))} disabled={safeIndex >= rivals.length - 1} aria-label="Outra sugestão">{safeIndex >= rivals.length - 1 ? "Sem outras sugestões" : "Outra"}</button><button type="button" className="min-tap bg-[var(--red)] px-3 font-condensed text-[10px] font-900 uppercase tracking-[0.12em] text-white" onClick={() => setOpen(true)}>Desafiar</button></div>
    </div>
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-32px),420px)] -translate-x-1/2 -translate-y-1/2 border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-2xl"><Dialog.Title className="font-condensed text-xl font-900 uppercase text-[var(--text)]">Enviar desafio?</Dialog.Title><Dialog.Description className="mt-2 text-sm text-[var(--text-secondary)]">Você vai desafiar <strong className="text-[var(--text)]">{rival.nickname}</strong> no evento {event.name}, usando o template Pontuação total.</Dialog.Description><div className="mt-5 flex justify-end gap-2"><Dialog.Close asChild><button type="button" className="min-tap border border-[var(--border)] px-4 font-condensed text-xs font-900 uppercase tracking-[0.12em] text-[var(--text)]">Cancelar</button></Dialog.Close><button type="button" disabled={loading} onClick={sendChallenge} className="min-tap bg-[var(--red)] px-4 font-condensed text-xs font-900 uppercase tracking-[0.12em] text-white disabled:opacity-50">{loading ? "Enviando…" : "Enviar desafio"}</button></div><Dialog.Close aria-label="Fechar" className="min-tap absolute right-2 top-2 text-xl text-[var(--text-muted)]">×</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
}
