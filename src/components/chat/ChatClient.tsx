"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { readApiResponse } from "@/lib/api";
import type { ChatMessage } from "@/types";

const POLL_INTERVAL_MS = 10_000;

function sortMessagesAscending(messages: ChatMessage[]) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export default function ChatClient({ groupId }: { groupId?: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [pollSince, setPollSince] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: smooth ? "smooth" : "instant",
        });
      }
    });
  }, []);

  const loadMessages = useCallback(async (before?: string | null) => {
    try {
      const params = new URLSearchParams();
      if (before) params.set("before", before);
      if (groupId) params.set("groupId", groupId);
      const res = await fetch(`/api/chat?${params.toString()}`);
      const data = await readApiResponse<{ messages: ChatMessage[]; hasMore: boolean }>(res);
      return data;
    } catch {
      return null;
    }
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setHasMore(false);
    setPollSince(null);

    (async () => {
      const data = await loadMessages(null);
      if (cancelled) return;
      if (data) {
        const orderedMessages = sortMessagesAscending(data.messages);
        setMessages(orderedMessages);
        setHasMore(data.hasMore);
        setPollSince(orderedMessages[orderedMessages.length - 1]?.created_at ?? new Date().toISOString());
      }
      setLoading(false);
      scrollToBottom(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadMessages, scrollToBottom]);

  useEffect(() => {
    if (loading || !pollSince) return;

    const interval = setInterval(async () => {
      try {
        const params = new URLSearchParams({ since: pollSince });
        if (groupId) params.set("groupId", groupId);
        const res = await fetch(`/api/chat?${params.toString()}`);
        const data = await readApiResponse<{ messages: ChatMessage[] }>(res);
        if (data.messages.length > 0) {
          const orderedMessages = sortMessagesAscending(data.messages);
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMessages = orderedMessages.filter((m) => !existingIds.has(m.id));
            if (newMessages.length === 0) return prev;
            return [...prev, ...newMessages];
          });
          setPollSince(orderedMessages[orderedMessages.length - 1].created_at);
          scrollToBottom(true);
        }
      } catch {
        // silent
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [groupId, loading, pollSince, scrollToBottom]);

  const handleLoadMore = async () => {
    if (messages.length === 0) return;
    const oldest = messages[0];
    const data = await loadMessages(oldest.created_at);
    if (data) {
      const olderMessages = sortMessagesAscending(data.messages);
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        return [...olderMessages.filter((m) => !existingIds.has(m.id)), ...prev];
      });
      setHasMore(data.hasMore);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const payload: Record<string, unknown> = { content: trimmed };
      if (groupId) payload.groupId = groupId;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readApiResponse<{ message: ChatMessage }>(res);
      setMessages((prev) => [...prev, data.message]);
      setPollSince(data.message.created_at);
      setInput("");
      scrollToBottom(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleHide = async (messageId: string) => {
    try {
      const res = await fetch(`/api/chat/${messageId}`, { method: "DELETE" });
      await readApiResponse<{ hidden: boolean }>(res);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast.success("Mensagem ocultada");
    } catch (err: any) {
      toast.error(err.message || "Erro ao ocultar mensagem");
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "";
    if (d.toDateString() === yesterday.toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="red-line">
        <span className="section-title" style={{ fontSize: "1.75rem" }}>
          BATE-PAPO
        </span>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-1 py-4 px-4"
        style={{ scrollBehavior: "smooth" }}
      >
        {hasMore && (
          <button
            type="button"
            onClick={handleLoadMore}
            className="w-full text-xs py-2 font-700 uppercase tracking-wider transition-all active:scale-95"
            style={{ color: "var(--text-muted)" }}
          >
            Carregar mais
          </button>
        )}

        {messages.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            Nenhuma mensagem ainda. Seja o primeiro a escrever!
          </p>
        )}

        {messages.map((msg) => {
          const profile = msg.profile as { nickname: string; first_name: string; last_name: string; role: string } | undefined;
          const isAdmin = profile?.role === "admin";

          return (
            <div key={msg.id} className="group relative">
              <div className="flex items-baseline gap-2">
                <span
                  className="font-condensed font-700 text-xs uppercase tracking-wider flex-shrink-0"
                  style={{ color: isAdmin ? "var(--red)" : "var(--text)" }}
                >
                  {profile?.nickname || "---"}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {formatDate(msg.created_at)}
                  {formatDate(msg.created_at) && " "}
                  {formatTime(msg.created_at)}
                </span>
              </div>
              <p className="text-sm mt-0.5" style={{ color: "var(--text)" }}>
                {msg.content}
              </p>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 p-4"
        style={{
          borderTop: "1px solid var(--border)",
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
          maxLength={500}
          disabled={sending}
          className="flex-1 min-w-0 px-4 py-3 text-sm"
          style={{
            backgroundColor: "var(--bg-card)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="px-5 py-3 text-sm font-700 uppercase tracking-wider transition-all active:scale-90 disabled:opacity-50"
          style={{
            backgroundColor: "var(--red)",
            color: "#fff",
            border: "1px solid var(--red)",
          }}
        >
          {sending ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
