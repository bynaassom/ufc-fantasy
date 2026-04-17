"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { readApiResponse } from "@/lib/api";
import type { NotificationsResponse } from "@/types/api";
import type { Notification } from "@/types";

const NOTIFICATIONS_CACHE_TTL_MS = 60_000;

let notificationsCache:
  | {
      data: NotificationsResponse;
      fetchedAt: number;
    }
  | null = null;

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

export default function NotificationBell() {
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
      const data = await readApiResponse<NotificationsResponse>(
        await fetch("/api/me/notifications"),
      );
      writeNotificationsCache(data);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setHasLoadedOnce(true);
    } catch (error) {
      console.error(error);
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

  return (
    <div className="relative">
      <button
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen && (!hasLoadedOnce || !readNotificationsCache())) {
            void loadNotifications(!readNotificationsCache());
          }
        }}
        className="relative flex items-center justify-center w-10 h-10 transition-opacity hover:opacity-80"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
        aria-label="Notificações"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          style={{ color: "var(--text)" }}
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 && (
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
          className="absolute right-0 top-full mt-2 w-80 z-50"
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
            <Link
              href="/desafios"
              onClick={() => setOpen(false)}
              className="text-xs font-condensed font-700 uppercase tracking-widest"
              style={{ color: "var(--red)" }}
            >
              Ver desafios
            </Link>
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
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notification, index) => (
                <Link
                  key={notification.id}
                  href={notification.target_path || "/desafios"}
                  onClick={() => {
                    setOpen(false);
                    void handleNotificationClick(notification);
                  }}
                  className="block px-4 py-3 transition-colors hover:bg-white/5"
                  style={{
                    borderBottom:
                      index < notifications.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    opacity: notification.read_at ? 0.7 : 1,
                  }}
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
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
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
