"use client";

import { useRef, useEffect, useCallback } from "react";
import ChatClient from "@/components/chat/ChatClient";
import { useChatDrawer } from "@/stores/chat-drawer";

export default function ChatDrawer() {
  const { isOpen, close } = useChatDrawer();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

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
      previousFocusRef.current?.focus();
    };
  }, [isOpen, close]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={close}
        />
      )}

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-chat-title"
        aria-hidden={!isOpen}
        onKeyDown={handleKeyDown}
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
