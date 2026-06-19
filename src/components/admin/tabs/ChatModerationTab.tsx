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
