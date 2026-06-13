"use client";

import { useChatDrawer } from "@/stores/chat-drawer";

export default function ChatFab() {
  const { isOpen, open } = useChatDrawer();

  if (isOpen) return null;

  return (
    <button
      onClick={open}
      className="fixed z-50 hidden md:flex items-center gap-2.5 shadow-lg transition-transform hover:scale-105 active:scale-95"
      style={{
        padding: "12px 18px",
        backgroundColor: "var(--red)",
        color: "#fff",
        bottom: 24,
        right: 20,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
      aria-label="Abrir bate-papo"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className="font-condensed font-900 text-xs uppercase tracking-widest">
        BATE-PAPO
      </span>
    </button>
  );
}
