"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { readApiResponse } from "@/lib/api";
import {
  readPushPromptDismissedUntil,
  shouldShowPushNotificationPrompt,
  writePushPromptDismissedUntil,
} from "@/lib/push-notification-prompt";
import type {
  PushSubscriptionResponse,
  VapidPublicKeyResponse,
} from "@/types/api";

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function getPushPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "default" as NotificationPermission;
  }

  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

async function saveSubscription(subscription: PushSubscription) {
  const subscriptionJson = subscription.toJSON();
  if (
    !subscriptionJson.endpoint ||
    !subscriptionJson.keys?.p256dh ||
    !subscriptionJson.keys?.auth
  ) {
    throw new Error("Inscricao push invalida.");
  }

  await readApiResponse<PushSubscriptionResponse>(
    await fetch("/api/me/push-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
        },
      }),
    }),
  );
}

async function getOrCreateSubscription(publicKey: string) {
  const registration = await navigator.serviceWorker.register("/sw.js");
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) return existingSubscription;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

export default function PushNotificationManager({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [dismissedUntil, setDismissedUntil] = useState<number | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const [busy, setBusy] = useState(false);

  const ensureSubscription = useCallback(
    async (shouldAskPermission: boolean) => {
      if (!publicKey || !isPushSupported()) return;

      let nextPermission = getPushPermission();
      if (nextPermission === "default" && shouldAskPermission) {
        nextPermission = await Notification.requestPermission();
      }

      setPermission(nextPermission);
      setPromptOpen(false);
      if (nextPermission !== "granted") return;

      const subscription = await getOrCreateSubscription(publicKey);
      await saveSubscription(subscription);
      setSubscribed(true);
    },
    [publicKey],
  );

  useEffect(() => {
    const supported = isPushSupported();
    setPushSupported(supported);
    setPermission(getPushPermission());
    setDismissedUntil(readPushPromptDismissedUntil(window.localStorage));

    let cancelled = false;

    async function boot() {
      try {
        const data = await readApiResponse<VapidPublicKeyResponse>(
          await fetch("/api/push/vapid-public-key"),
        );
        if (cancelled || !data.enabled || !data.publicKey) return;

        setPublicKey(data.publicKey);

        if (supported && getPushPermission() === "granted") {
          const subscription = await getOrCreateSubscription(data.publicKey);
          await saveSubscription(subscription);
          if (!cancelled) setSubscribed(true);
        }
      } catch (error) {
        console.error(error);
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handlePicksSaved() {
      const shouldOpen = shouldShowPushNotificationPrompt({
        publicKey,
        subscribed,
        permission,
        dismissedUntil,
        now: Date.now(),
        pushSupported,
        showUnsupportedPrompt: false, // never auto-show full prompt on mobile
      });

      setPromptOpen(shouldOpen);
    }

    window.addEventListener("ufc-fantasy:picks-saved", handlePicksSaved);
    return () =>
      window.removeEventListener("ufc-fantasy:picks-saved", handlePicksSaved);
  }, [dismissedUntil, permission, publicKey, pushSupported, subscribed, variant]);

  async function handleEnablePush() {
    setBusy(true);
    try {
      await ensureSubscription(true);
      if (getPushPermission() === "granted") {
        toast.success("Alertas ativados.");
      } else if (getPushPermission() === "denied") {
        toast.error("Permissão bloqueada. Ative nas configurações do navegador.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel ativar os alertas.");
    } finally {
      setBusy(false);
    }
  }

  function handleDismissPrompt() {
    const nextDismissedUntil = writePushPromptDismissedUntil(
      window.localStorage,
      Date.now(),
    );
    setDismissedUntil(nextDismissedUntil);
    setPromptOpen(false);
  }

  if (!publicKey || subscribed || permission !== "default") return null;

  const className =
    variant === "mobile"
      ? "md:hidden fixed right-4 bottom-20 z-50 flex items-center justify-center w-11 h-11 transition-opacity hover:opacity-80 disabled:opacity-50"
      : "hidden md:flex items-center justify-center w-10 h-10 transition-opacity hover:opacity-80 disabled:opacity-50";

  const button = pushSupported ? (
    <button
      type="button"
      onClick={handleEnablePush}
      disabled={busy}
      className={className}
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      }}
      aria-label="Ativar alertas push"
      title="Ativar alertas"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path d="M12 3a4 4 0 0 0-4 4v2.5L6.4 12.7A2 2 0 0 0 8.2 15.6h7.6a2 2 0 0 0 1.8-2.9L16 9.5V7a4 4 0 0 0-4-4Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
        <path d="M19 5l2-2" />
        <path d="M5 5 3 3" />
      </svg>
    </button>
  ) : null;

  const overlayClassName =
    variant === "mobile"
      ? "md:hidden fixed inset-0 z-[80] flex items-center justify-center px-4 pb-6 pt-20 overflow-y-auto"
      : "hidden md:flex fixed inset-0 z-[80] items-center justify-center px-4";
  const overlayBg = "var(--bg-overlay-82)";

  return (
    <>
      {button}
      {promptOpen && (
        <div className={overlayClassName} style={{ backgroundColor: overlayBg }}>
          <div
            className="w-full max-w-sm overflow-hidden"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderTop: "3px solid var(--red)",
            }}
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center"
                  style={{
                    backgroundColor: "rgba(232,0,26,0.12)",
                    color: "var(--red)",
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  >
                    <path d="M12 3a4 4 0 0 0-4 4v2.5L6.4 12.7A2 2 0 0 0 8.2 15.6h7.6a2 2 0 0 0 1.8-2.9L16 9.5V7a4 4 0 0 0-4-4Z" />
                    <path d="M10 19a2 2 0 0 0 4 0" />
                    <path d="M19 5l2-2" />
                    <path d="M5 5 3 3" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p
                    className="font-condensed text-lg font-900 uppercase leading-tight"
                    style={{ color: "var(--text)" }}
                  >
                    {pushSupported ? "Ativar alertas?" : "Alertas no celular"}
                  </p>
                  <p
                    className="mt-2 text-sm leading-snug"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {pushSupported
                      ? "A gente te avisa quando os picks abrirem, quando estiverem quase fechando e quando o card mudar."
                      : "No iPhone, as notificações só aparecem quando o app está adicionado à Tela de Início. Adicione o UFC Fantasy à tela inicial e abra por lá para ativar os alertas."}
                  </p>
                </div>
              </div>
            </div>
            <div
              className={pushSupported ? "grid grid-cols-2" : "grid grid-cols-1"}
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <button
                type="button"
                onClick={handleDismissPrompt}
                className="px-4 py-3 font-condensed text-xs font-700 uppercase tracking-widest transition-opacity hover:opacity-75"
                style={{
                  color: "var(--text-secondary)",
                  borderRight: pushSupported ? "1px solid var(--border)" : "none",
                }}
              >
                {pushSupported ? "Agora não" : "Entendi"}
              </button>
              {pushSupported && (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={busy}
                  className="px-4 py-3 font-condensed text-xs font-900 uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "var(--red)" }}
                >
                  {busy ? "Ativando..." : "Ativar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
