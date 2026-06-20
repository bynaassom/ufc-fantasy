"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { readApiResponse } from "@/lib/api";
import type { NotificationPreferences } from "@/types";

type NotificationKey = keyof NotificationPreferences;

type Section = {
  title: string;
  keys: { key: NotificationKey; label: string; desc: string }[];
};

const SECTIONS: Section[] = [
  {
    title: "Picks",
    keys: [
      { key: "picks_opened", label: "Picks abertos", desc: "Notificar quando os picks abrirem para um evento" },
      { key: "picks_closed", label: "Picks fechados", desc: "Notificar quando os picks fecharem" },
    ],
  },
  {
    title: "Lembretes",
    keys: [
      { key: "picks_reminders", label: "Lembretes de pick", desc: "Lembretes antes do fechamento dos picks" },
    ],
  },
  {
    title: "Cartas",
    keys: [
      { key: "card_updated", label: "Card atualizado", desc: "Notificar quando o card do evento for alterado (lutas adicionadas/removidas)" },
      { key: "perfect_pick", label: "Cravadas", desc: "Notificar quando voce cravar uma luta (vencedor, metodo e round)" },
      { key: "event_completed", label: "Evento encerrado", desc: "Notificar quando um evento for encerrado e os resultados estiverem disponiveis" },
    ],
  },
  {
    title: "Desafios",
    keys: [
      { key: "challenge_received", label: "Desafio recebido", desc: "Notificar quando alguem te desafiar" },
      { key: "challenge_accepted", label: "Desafio aceito", desc: "Notificar quando seu desafio for aceito" },
      { key: "challenge_declined", label: "Desafio recusado", desc: "Notificar quando seu desafio for recusado" },
      { key: "challenge_result", label: "Resultado de desafio", desc: "Notificar o resultado de um desafio" },
    ],
  },
  {
    title: "Conquistas",
    keys: [
      { key: "badge_earned", label: "Badges", desc: "Notificar quando voce desbloquear um novo badge" },
      { key: "level_up", label: "Subiu de nivel", desc: "Notificar quando voce subir de nivel" },
    ],
  },
  {
    title: "Eventos",
    keys: [
      { key: "event_recap", label: "Recap de evento", desc: "Resumo do evento enviado apos o encerramento" },
    ],
  },
  {
    title: "Liga",
    keys: [
      { key: "league_rank", label: "Mudanca de posicao na liga", desc: "Notificar quando sua posicao na liga mudar" },
    ],
  },
  {
    title: "Chat",
    keys: [
      { key: "chat_mention", label: "Mencoes no chat", desc: "Notificar quando alguem te mencionar no chat" },
    ],
  },
  {
    title: "Desafios diretos",
    keys: [
      { key: "rivalry_result", label: "Resultado de desafio", desc: "Notificar o resultado de um confronto direto" },
    ],
  },
];

export default function NotificationPreferencesSection() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<NotificationKey | null>(null);

  useEffect(() => {
    fetch("/api/me/notification-preferences")
      .then((res) => readApiResponse<{ preferences: NotificationPreferences }>(res))
      .then((data) => setPreferences(data.preferences))
      .catch(() => setError("Erro ao carregar preferências."))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback(
    async (key: NotificationKey) => {
      if (!preferences) return;
      const next = { ...preferences, [key]: !preferences[key] };
      setSaving(key);
      try {
        const data = await readApiResponse<{ preferences: NotificationPreferences }>(
          await fetch("/api/me/notification-preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          }),
        );
        setPreferences(data.preferences);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setSaving(null);
      }
    },
    [preferences],
  );

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="red-line">
            <span className="section-title" style={{ fontSize: "1.75rem" }}>
              NOTIFICAÇÕES
            </span>
          </div>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Carregando...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 px-6" style={{ color: "var(--text-muted)" }}>
        <p className="text-sm" style={{ color: "var(--red)" }}>{error}</p>
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div>
      <div className="mb-6">
        <div className="red-line">
          <span className="section-title" style={{ fontSize: "1.75rem" }}>
            NOTIFICAÇÕES
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p
              className="block text-xs font-700 uppercase tracking-widest mb-3 font-condensed"
              style={{ color: "var(--text-secondary)" }}
            >
              {section.title}
            </p>
            <div style={{ border: "1px solid var(--border)" }}>
              {section.keys.map((item, idx) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between px-4 py-3.5"
                  style={{
                    borderBottom:
                      idx < section.keys.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p
                      className="font-condensed font-700 text-sm uppercase tracking-wider"
                      style={{ color: "var(--text)" }}
                    >
                      {item.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {item.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(item.key)}
                    disabled={saving === item.key}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-sm font-700 transition-all active:scale-90 disabled:opacity-50"
                    style={{
                      backgroundColor: preferences[item.key]
                        ? "var(--red)"
                        : "var(--bg-card)",
                      color: preferences[item.key] ? "#fff" : "var(--text-muted)",
                      border: preferences[item.key]
                        ? "1px solid var(--red)"
                        : "1px solid var(--border)",
                    }}
                  >
                    {saving === item.key
                      ? "..."
                      : preferences[item.key]
                        ? "\u2713"
                        : "\u2715"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
