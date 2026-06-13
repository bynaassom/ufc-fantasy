"use client";

import { useChatDrawer } from "@/stores/chat-drawer";

export default function ChatFab() {
  const { isOpen, open } = useChatDrawer();

  if (isOpen) return null;

  return (
    <button
      onClick={open}
      className="fixed z-50 hidden md:flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
      style={{
        width: 56,
        height: 56,
        backgroundColor: "var(--red)",
        color: "#fff",
        bottom: 24,
        right: 20,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
      aria-label="Abrir bate-papo"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
