"use client";

import { useEffect, useMemo, useState, useDeferredValue } from "react";
import toast from "react-hot-toast";

import {
  adminGet,
  adminSend,
  inp,
  sel,
  focus,
  blur,
  formatAdminDateTime,
} from "../shared";
import type { SubTab } from "../types";

// ─── Props ───────────────────────────────────────────────────
export default function UsersTab({
  subTab,
  userList,
  setUserList,
  users,
}: {
  subTab: SubTab;
  userList: any[];
  setUserList: (users: any[]) => void;
  users?: any[];
}) {
  switch (subTab) {
    case "usuarios":
      return <Usuarios userList={userList} setUserList={setUserList} />;
    case "ops-auditoria":
      return <OperacoesAuditoria users={users || userList} />;
    default:
      return null;
  }
}

// ─── USUÁRIOS ────────────────────────────────────────────────
function Usuarios({ userList, setUserList }: any) {
  async function toggleBan(userId: string, currentBan: boolean) {
    try {
      await adminSend(`/api/admin/users/${userId}/ban`, {
        method: "POST",
        body: JSON.stringify({ currentBan }),
      });
    } catch (error: any) {
      toast.error(error.message);
      return;
    }
    setUserList((u: any[]) =>
      u.map((p: any) =>
        p.id === userId ? { ...p, is_banned: !currentBan } : p,
      ),
    );
    toast.success(currentBan ? "Usuário desbanido." : "Usuário banido.");
  }

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      await adminSend(`/api/admin/users/${userId}/role`, {
        method: "POST",
        body: JSON.stringify({ currentRole }),
      });
    } catch (error: any) {
      toast.error(error.message);
      return;
    }
    setUserList((u: any[]) =>
      u.map((p: any) => (p.id === userId ? { ...p, role: newRole } : p)),
    );
    toast.success(`Role alterada para ${newRole}.`);
  }

  return (
    <div style={{ border: "1px solid var(--border)" }}>
      <div
        className="grid grid-cols-12 px-4 py-2"
        style={{
          backgroundColor: "var(--bg-elevated)",
          borderBottom: "2px solid var(--red)",
        }}
      >
        {["Nickname", "Nome", "Pts", "Role", "Ação"].map((h, i) => (
          <div
            key={h}
            className={
              i === 0
                ? "col-span-3"
                : i === 1
                  ? "col-span-4"
                  : i === 4
                    ? "col-span-2 text-right"
                    : "col-span-1"
            }
          >
            <span
              className="font-condensed font-700 text-xs uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              {h}
            </span>
          </div>
        ))}
      </div>
      {userList.map((u: any, i: number) => (
        <div
          key={u.id}
          className="grid grid-cols-12 items-center px-4 py-3"
          style={{
            borderBottom:
              i < userList.length - 1
                ? "1px solid var(--border-light)"
                : "none",
          }}
        >
          <div className="col-span-3">
            <span
              className="font-condensed font-900 text-sm uppercase"
              style={{
                color: u.is_banned ? "var(--text-muted)" : "var(--text)",
              }}
            >
              {u.nickname}
            </span>
          </div>
          <div className="col-span-4">
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {u.first_name} {u.last_name}
            </span>
          </div>
          <div className="col-span-1">
            <span
              className="font-condensed font-700 text-sm"
              style={{ color: "var(--red)" }}
            >
              {u.total_points}
            </span>
          </div>
          <div className="col-span-1">
            <span
              className="font-condensed font-600 text-xs uppercase"
              style={{
                color: u.role === "admin" ? "var(--red)" : "var(--text-muted)",
              }}
            >
              {u.role}
            </span>
          </div>
          <div className="col-span-2 flex gap-1 justify-end">
            <button
              onClick={() => toggleRole(u.id, u.role)}
              className="font-condensed font-700 text-xs uppercase px-2 py-1 transition-opacity hover:opacity-70"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontSize: "10px",
              }}
            >
              {u.role === "admin" ? "→USER" : "→ADMIN"}
            </button>
            <button
              onClick={() => toggleBan(u.id, u.is_banned)}
              className="font-condensed font-700 text-xs uppercase px-2 py-1 transition-opacity hover:opacity-70"
              style={{
                border: `1px solid ${u.is_banned ? "var(--border)" : "var(--red)"}`,
                color: u.is_banned ? "var(--text-muted)" : "var(--red)",
                fontSize: "10px",
              }}
            >
              {u.is_banned ? "DESBANIR" : "BANIR"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── OPERAÇÕES: Auditoria ────────────────────────────────────
function OperacoesAuditoria({ users }: { users: any[] }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [page, setPage] = useState(1);

  const userMap = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    setError("");
    try {
      const data = await adminGet<{ logs: any[] }>("/api/admin/audit-logs");
      setLogs(data.logs || []);
      setPage(1);
    } catch (err) {
      setError(String(err));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  function formatAction(action: string) {
    const labels: Record<string, string> = {
      admin_bulk_events: "Ações em lote",
      admin_enrich_fighter_media: "Fotos de lutadores",
      admin_merge_fighters: "Merge de lutadores",
      admin_sync_events: "Sync de eventos",
      admin_sync_odds: "Sync de odds",
      admin_sync_results: "Sync de resultados",
      admin_score_fight: "Pontuação manual",
      rapid_picks: "Atividade suspeita",
    };
    return labels[action] || action;
  }

  const actionOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const searchTerm = deferredSearch.trim().toLowerCase();
    return logs.filter((log) => {
      if (suspiciousOnly && !log.suspicious) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (!searchTerm) return true;

      const actor = log.user_id ? userMap.get(log.user_id) : null;
      const haystack = [
        formatAction(log.action),
        log.action,
        actor?.nickname,
        actor?.first_name,
        actor?.last_name,
        JSON.stringify(log.details || {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchTerm);
    });
  }, [logs, suspiciousOnly, actionFilter, deferredSearch, userMap]);

  const visibleLogs = filteredLogs.slice(0, page * 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            Auditoria
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Ações recentes do admin e alertas operacionais.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="px-3 py-2 font-condensed font-900 text-xs uppercase tracking-widest disabled:opacity-40"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          {loading ? "ATUALIZANDO..." : "ATUALIZAR"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por ação, usuário ou payload"
          style={inp}
          onFocus={focus}
          onBlur={blur}
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={sel}
          onFocus={focus}
          onBlur={blur}
        >
          <option value="all">Todas as ações</option>
          {actionOptions.map((action) => (
            <option key={action} value={action}>
              {formatAction(action)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-3" style={{ color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={suspiciousOnly}
            onChange={(e) => setSuspiciousOnly(e.target.checked)}
          />
          <span className="text-xs uppercase tracking-widest">Só suspeitos</span>
        </label>
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Exibindo {visibleLogs.length} de {filteredLogs.length} log(s) filtrados.
      </p>

      {error && (
        <p className="text-sm" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}

      <div style={{ border: "1px solid var(--border)" }}>
        {filteredLogs.length === 0 && !loading ? (
          <div className="p-4">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Nenhum log encontrado para esse filtro.
            </p>
          </div>
        ) : (
          visibleLogs.map((log, index) => {
            const actor = log.user_id ? userMap.get(log.user_id) : null;
            return (
              <div
                key={log.id}
                className="px-4 py-3 space-y-1"
                style={{
                  borderBottom:
                    index < visibleLogs.length - 1 ? "1px solid var(--border-light)" : "none",
                  backgroundColor: log.suspicious ? "rgba(232,0,26,0.04)" : "var(--bg-card)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p
                    className="font-condensed font-700 text-sm uppercase"
                    style={{ color: log.suspicious ? "var(--red)" : "var(--text)" }}
                  >
                    {formatAction(log.action)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatAdminDateTime(log.created_at)}
                  </p>
                </div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {actor
                    ? `${actor.nickname} (${actor.first_name} ${actor.last_name})`
                    : "Sistema / chamada externa"}
                </p>
                {log.details && (
                  <pre
                    className="text-xs whitespace-pre-wrap"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
                    }}
                  >
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>

      {visibleLogs.length < filteredLogs.length && (
        <button
          onClick={() => setPage((current) => current + 1)}
          className="px-4 py-2 font-condensed font-900 text-xs uppercase tracking-widest"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          Carregar Mais
        </button>
      )}
    </div>
  );
}
