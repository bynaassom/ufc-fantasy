"use client";

import { useEffect, useState } from "react";
import { adminGet } from "@/components/admin/shared";

type AdminStats = {
  total_users: number;
  total_events: number;
  total_picks: number;
  total_challenges: number;
  total_groups: number;
  total_chat_messages: number;
  active_users_last_7d: number;
  picks_this_event: number;
};

export default function AnalyticsTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminGet<{ stats: AdminStats }>("/api/admin/stats");
        setStats(data.stats);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Erro ao carregar estatísticas.</p>
      </div>
    );
  }

  const rows: { label: string; value: string | number }[] = [
    { label: "Usuários totais", value: stats.total_users },
    { label: "Usuários ativos (7 dias)", value: stats.active_users_last_7d },
    { label: "Eventos", value: stats.total_events },
    { label: "Picks totais", value: stats.total_picks },
    { label: "Picks no evento atual", value: stats.picks_this_event },
    { label: "Desafios", value: stats.total_challenges },
    { label: "Ligas criadas", value: stats.total_groups },
    { label: "Mensagens no chat", value: stats.total_chat_messages },
  ];

  return (
    <div className="p-6">
      <p
        className="font-condensed font-700 text-xs uppercase tracking-widest mb-4"
        style={{ color: "var(--text-secondary)" }}
      >
        Painel de Estatísticas
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="p-4"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
          >
            <p
              className="font-condensed font-900 text-2xl"
              style={{ color: "var(--red)" }}
            >
              {row.value}
            </p>
            <p
              className="font-condensed font-700 text-xs uppercase tracking-widest mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {row.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
