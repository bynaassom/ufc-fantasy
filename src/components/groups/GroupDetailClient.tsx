"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { GroupWithMembers } from "@/types";
import CopyInviteButton from "@/components/groups/CopyInviteButton";
import ChatClient from "@/components/chat/ChatClient";

interface MemberWithScore {
  id: string;
  user_id: string;
  role: "admin" | "member";
  profile: {
    id: string;
    nickname: string;
    first_name: string;
    last_name: string;
    headshot_url?: string;
    total_points: number;
  } | null;
  total_points: number;
  perfect_picks?: number;
  events_played?: number;
  rank_position?: number;
}

export default function GroupDetailClient({
  group,
  currentUserId,
}: {
  group: GroupWithMembers;
  currentUserId: string;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const members = (group.members || []) as unknown as MemberWithScore[];
  members.sort((a, b) => (a.rank_position || 9999) - (b.rank_position || 9999));

  const isAdmin = members.some(
    (m) => m.user_id === currentUserId && m.role === "admin",
  );

  async function handleLeave() {
    if (!confirm("Sair da liga?")) return;
    setLeaving(true);
    try {
      const res = await fetch("/api/groups/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Erro ao sair.");
      }
      toast.success("Você saiu da liga.");
      router.push("/ligas");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div>
      <Link href="/ligas" className="inline-flex items-center gap-1 mb-4" style={{ color: "var(--text-muted)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="text-xs font-condensed font-700 uppercase tracking-wider">Ligas</span>
      </Link>
      {/* Header */}
      <div className="mb-6 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
        <p
          className="font-condensed font-700 text-xs uppercase tracking-widest"
          style={{ color: "var(--text-secondary)" }}
        >
          Liga
        </p>
        <h1
          className="font-condensed font-900 text-3xl uppercase tracking-wide mt-1"
          style={{ color: "var(--text)" }}
        >
          {group.name}
        </h1>
        {group.description && (
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            {group.description}
          </p>
        )}
        <p className="text-xs mt-2 font-mono" style={{ color: "var(--text-muted)" }}>
          Código: {group.invite_code}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyInviteButton inviteCode={group.invite_code} />
          <button
            onClick={() => {
              const origin = window.location.origin;
              const text = `Entre na minha liga do UFC Fantasy! ${origin}/convite/${group.invite_code}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
            }}
            className="px-4 py-2 font-condensed text-xs font-900 uppercase tracking-widest text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#25D366" }}
          >
            Convidar no WhatsApp
          </button>
        </div>

        {isAdmin && (
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="mt-4 px-4 py-2 text-xs font-condensed font-900 uppercase tracking-widest"
            style={{
              color: "var(--red)",
              border: "1px solid var(--red)",
              backgroundColor: "transparent",
            }}
          >
            {leaving ? "Saindo..." : "Excluir liga"}
          </button>
        )}
        {!isAdmin && (
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="mt-4 px-4 py-2 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {leaving ? "Saindo..." : "Sair da liga"}
          </button>
        )}
      </div>

      {/* Ranking */}
      <p
        className="font-condensed font-700 text-xs uppercase tracking-widest mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        Ranking da temporada · {members.length} membro(s)
      </p>

      <div className="space-y-2">
        {members.map((member, idx) => {
          const rank = member.rank_position && member.rank_position < 9999 ? member.rank_position : idx + 1;
          const isMe = member.user_id === currentUserId;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3"
              style={{
                backgroundColor: isMe ? "var(--bg-card)" : "transparent",
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${rank <= 3 ? "var(--red)" : "var(--border)"}`,
              }}
            >
              {/* Rank number */}
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-condensed font-900 text-sm"
                style={{
                  backgroundColor: rank <= 3 ? "var(--red)" : "var(--bg)",
                  color: rank <= 3 ? "white" : "var(--text-secondary)",
                }}
              >
                {rank}
              </span>

              {/* Profile link */}
              <Link
                href={`/jogador/${member.profile?.nickname || "#"}`}
                className="flex-1 min-w-0"
              >
                <p
                  className="font-condensed font-900 text-sm uppercase tracking-wide truncate"
                  style={{ color: isMe ? "var(--red)" : "var(--text)" }}
                >
                  {member.profile?.nickname || "Desconhecido"}
                  {isMe && (
                    <span className="text-xs font-normal lowercase ml-1" style={{ color: "var(--text-muted)" }}>
                      (você)
                    </span>
                  )}
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {member.profile?.first_name} {member.profile?.last_name}
                  {member.role === "admin" && (
                    <span className="ml-2 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      admin
                    </span>
                  )}
                </p>
                <p className="text-[10px] font-condensed font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  {member.events_played || 0} eventos · {member.perfect_picks || 0} cravadas
                </p>
              </Link>

              {/* Points */}
              <span
                className="flex-shrink-0 font-condensed font-900 text-lg"
                style={{ color: "var(--text)" }}
              >
                {member.total_points}
              </span>
            </div>
          );
        })}
      </div>

      {/* Chat */}
      <div className="mt-8" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          type="button"
          onClick={() => setShowChat((v) => !v)}
          className="w-full flex items-center justify-between py-4"
        >
          <span
            className="font-condensed font-700 text-xs uppercase tracking-widest"
            style={{ color: "var(--text-secondary)" }}
          >
            Bate-papo da liga
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              color: "var(--text-muted)",
              transform: showChat ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {showChat && (
          <div className="pb-4" style={{ height: "400px" }}>
            <ChatClient groupId={group.id} />
          </div>
        )}
      </div>
    </div>
  );
}
