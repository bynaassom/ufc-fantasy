"use client";

import { useRef, useEffect } from "react";
import ChatClient from "@/components/chat/ChatClient";
import { useChatDrawer } from "@/stores/chat-drawer";

export default function ChatDrawer() {
  const { isOpen, close } = useChatDrawer();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, close]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] md:block hidden"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={close}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-chat-title"
        aria-hidden={!isOpen}
        className="fixed z-[70] top-0 right-0 h-full flex flex-col"
        style={{
          width: "min(420px, 100vw)",
          height: "100dvh",
          backgroundColor: "var(--bg)",
          borderLeft: "1px solid var(--border)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease-in-out",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div
          className="flex items-center justify-between px-4 h-14 flex-shrink-0"
          style={{ borderBottom: "2px solid var(--red)" }}
        >
          <p
            id="global-chat-title"
            className="font-condensed font-900 text-sm uppercase tracking-widest"
            style={{ color: "var(--text)" }}
          >
            Bate-papo
          </p>
          <button
            ref={closeButtonRef}
            onClick={close}
            className="flex items-center justify-center w-10 h-10 transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
            aria-label="Fechar bate-papo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {isOpen && <ChatClient />}
        </div>
      </div>
    </>
  );
}
