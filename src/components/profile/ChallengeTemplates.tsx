"use client";

import { useState } from "react";
import { adminSend } from "@/components/admin/shared";
import toast from "react-hot-toast";
import type { ChallengeTemplateType } from "@/types";

const TEMPLATES: { type: ChallengeTemplateType; icon: string; label: string; desc: string }[] = [
  { type: "beat_my_score", icon: "🎯", label: "Bater minha pontuacao", desc: "Quem fizer mais pontos no evento vence" },
  { type: "more_winners", icon: "🥊", label: "Acerte mais vencedores", desc: "Quem acertar mais vencedores vence" },
  { type: "use_my_picks", icon: "📋", label: "Use meus picks como gabarito", desc: "Meus palpites viram o gabarito" },
];

export default function ChallengeTemplates({
  challengedId,
  challengedNickname,
  eventId,
}: {
  challengedId: string;
  challengedNickname: string;
  eventId: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function sendChallenge(template: ChallengeTemplateType) {
    setLoading(template);
    try {
      await adminSend("/api/challenges", {
        method: "POST",
        body: JSON.stringify({ challengedId, eventId, template }),
      });
      toast.success(`Desafio enviado para ${challengedNickname}!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-4">
      <p className="font-condensed text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
        Desafiar para...
      </p>
      <div className="grid gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.type}
            onClick={() => sendChallenge(t.type)}
            disabled={loading === t.type}
            className="flex items-start gap-3 p-3 text-left transition-all"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              opacity: loading === t.type ? 0.5 : 1,
            }}
          >
            <span className="text-lg mt-0.5">{t.icon}</span>
            <div>
              <div className="font-condensed font-700 text-sm uppercase" style={{ color: "var(--red)" }}>
                {loading === t.type ? "Enviando..." : t.label}
              </div>
              <div className="font-condensed text-xs" style={{ color: "var(--text-muted)" }}>
                {t.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
