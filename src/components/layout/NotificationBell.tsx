"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readApiResponse } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { NotificationsResponse } from "@/types/api";
import type { Notification } from "@/types";
import toast from "react-hot-toast";

const NOTIFICATIONS_CACHE_TTL_MS = 60_000;

let notificationsCache:
  | {
      data: NotificationsResponse;
      fetchedAt: number;
    }
  | null = null;

let notificationsRequest: Promise<NotificationsResponse> | null = null;

function readNotificationsCache() {
  if (!notificationsCache) return null;
  if (Date.now() - notificationsCache.fetchedAt > NOTIFICATIONS_CACHE_TTL_MS) {
    return null;
  }
  return notificationsCache.data;
}

function writeNotificationsCache(data: NotificationsResponse) {
  notificationsCache = {
    data,
    fetchedAt: Date.now(),
  };
}

function fetchNotificationsOnce() {
  if (!notificationsRequest) {
    notificationsRequest = fetch("/api/me/notifications")
      .then((response) => readApiResponse<NotificationsResponse>(response))
      .finally(() => {
        notificationsRequest = null;
      });
  }

  return notificationsRequest;
}

export default function NotificationBell({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const cachedNotifications = readNotificationsCache();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(
    () => cachedNotifications?.notifications || [],
  );
  const [unreadCount, setUnreadCount] = useState(
    () => cachedNotifications?.unreadCount || 0,
  );
  const [hasLoadedOnce, setHasLoadedOnce] = useState(Boolean(cachedNotifications));
  const [clearing, setClearing] = useState(false);

  async function loadNotifications(force = false) {
    const cached = !force ? readNotificationsCache() : null;
    if (cached) {
      setNotifications(cached.notifications);
      setUnreadCount(cached.unreadCount);
      setHasLoadedOnce(true);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchNotificationsOnce();
      writeNotificationsCache(data);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setHasLoadedOnce(true);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar as notificações.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (readNotificationsCache()) {
      return;
    }

    const callback = () => {
      void loadNotifications();
    };

    const requestIdle = window.requestIdleCallback?.bind(window);
    const cancelIdle = window.cancelIdleCallback?.bind(window);

    if (requestIdle && cancelIdle) {
      const idleId = requestIdle(callback);
      return () => cancelIdle(idleId);
    }

    const timeoutId = globalThis.setTimeout(callback, 1200);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  async function handleClearAll() {
    setClearing(true);
    try {
      await readApiResponse(
        await fetch("/api/me/notifications", { method: "POST" }),
      );
      const cleared = notifications.map((n) => ({
        ...n,
        read_at: n.read_at || new Date().toISOString(),
      }));
      setNotifications(cleared);
      setUnreadCount(0);
      writeNotificationsCache({ notifications: cleared, unreadCount: 0 });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível marcar as notificações como lidas.");
    } finally {
      setClearing(false);
    }
  }

  async function handleNotificationClick(notification: Notification) {
    if (notification.read_at) return;

    try {
      await readApiResponse(
        await fetch(`/api/me/notifications/${notification.id}`, {
          method: "PATCH",
        }),
      );
      const readAt = new Date().toISOString();
      const nextNotifications = notifications.map((entry) =>
        entry.id === notification.id ? { ...entry, read_at: readAt } : entry,
      );
      const nextUnreadCount = Math.max(0, unreadCount - 1);

      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);
      writeNotificationsCache({
        notifications: nextNotifications,
        unreadCount: nextUnreadCount,
      });
    } catch (error) {
      console.error(error);
    }
  }

  const isMobile = variant === "mobile";
  const rootClassName = isMobile ? "relative flex flex-1 min-w-0 justify-center" : "relative";
  const buttonClassName = isMobile
    ? "relative flex w-full min-w-0 flex-col items-center gap-0.5 px-1 py-2"
    : "relative min-tap transition-opacity hover:opacity-80";
  const buttonStyle = isMobile
    ? {
        color: unreadCount > 0 ? "var(--red)" : "var(--text-muted)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }
    : {
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      };
  const iconColor = isMobile
    ? unreadCount > 0
      ? "var(--red)"
      : "var(--text-muted)"
    : "var(--text)";
  const panelClassName = isMobile
    ? "fixed left-3 right-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] z-[70] max-h-[70vh] overflow-hidden"
    : "absolute right-0 top-full mt-2 w-80 z-50";
  const listClassName = isMobile
    ? "max-h-[52vh] overflow-y-auto"
    : "max-h-96 overflow-y-auto";

  return (
    <div className={rootClassName}>
      <button
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen && (!hasLoadedOnce || !readNotificationsCache())) {
            void loadNotifications(!readNotificationsCache());
          }
        }}
        className={buttonClassName}
        style={buttonStyle}
        aria-label="Notificações"
        aria-expanded={open}
        aria-controls={`notifications-panel-${variant}`}
      >
        <span className="relative flex items-center justify-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            style={{ color: iconColor }}
          >
            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
            <path d="M10 21a2 2 0 0 0 4 0" />
          </svg>
          {isMobile && unreadCount > 0 && (
            <span
              className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-black"
              style={{ backgroundColor: "var(--red)", color: "white" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        {isMobile && (
          <span
            className="font-condensed font-700 uppercase tracking-widest"
            style={{ fontSize: "9px" }}
          >
            ALERTAS
          </span>
        )}
        {!isMobile && unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-black"
            style={{ backgroundColor: "var(--red)", color: "white" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={`notifications-panel-${variant}`}
          className={panelClassName}
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderTop: "2px solid var(--red)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div>
              <p
                className="font-condensed font-900 text-sm uppercase tracking-wide"
                style={{ color: "var(--text)" }}
              >
                Notificações
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {unreadCount} não lida(s)
              </p>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="text-xs font-condensed font-700 uppercase tracking-widest transition-all active:scale-95"
                  style={{ color: "var(--text-muted)" }}
                >
                  {clearing ? "Marcando…" : "Marcar todas como lidas"}
                </button>
              )}
              <Link
                href="/desafios"
                onClick={() => setOpen(false)}
                className="text-xs font-condensed font-700 uppercase tracking-widest"
                style={{ color: "var(--red)" }}
              >
                Ver desafios
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Nenhuma notificação por enquanto.
            </div>
          ) : (
            <div className={listClassName}>
              {notifications.map((notification, index) => (
                <Link
                  key={notification.id}
                  href={notification.target_path || "/desafios"}
                  onClick={() => {
                    setOpen(false);
                    void handleNotificationClick(notification);
                  }}
                  className="block px-4 py-3 hover-bg-elevated"
                  style={{
                    borderBottom:
                      index < notifications.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    opacity: notification.read_at ? 0.7 : 1,
                  } as React.CSSProperties}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: notification.read_at
                          ? "var(--border)"
                          : "var(--red)",
                      }}
                    />
                    <div className="min-w-0">
                      <p
                        className="font-condensed font-900 text-sm uppercase tracking-wide leading-tight"
                        style={{ color: "var(--text)" }}
                      >
                        {notification.title}
                      </p>
                      <p
                        className="text-sm mt-1 leading-snug"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
