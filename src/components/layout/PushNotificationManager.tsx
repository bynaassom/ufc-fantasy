"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { readApiResponse } from "@/lib/api";
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

export default function PushNotificationManager({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const ensureSubscription = useCallback(
    async (shouldAskPermission: boolean) => {
      if (!publicKey || !isPushSupported()) return;

      let nextPermission = Notification.permission;
      if (nextPermission === "default" && shouldAskPermission) {
        nextPermission = await Notification.requestPermission();
      }

      setPermission(nextPermission);
      if (nextPermission !== "granted") return;

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await saveSubscription(subscription);
      setSubscribed(true);
    },
    [publicKey],
  );

  useEffect(() => {
    if (!isPushSupported()) return;

    setPermission(Notification.permission);

    let cancelled = false;

    async function boot() {
      try {
        const data = await readApiResponse<VapidPublicKeyResponse>(
          await fetch("/api/push/vapid-public-key"),
        );
        if (cancelled || !data.enabled || !data.publicKey) return;

        setPublicKey(data.publicKey);

        if (Notification.permission === "granted") {
          const registration = await navigator.serviceWorker.register("/sw.js");
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await saveSubscription(subscription);
            if (!cancelled) setSubscribed(true);
          }
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

  async function handleEnablePush() {
    setBusy(true);
    try {
      await ensureSubscription(true);
      if (Notification.permission === "granted") {
        toast.success("Alertas ativados.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel ativar os alertas.");
    } finally {
      setBusy(false);
    }
  }

  if (!publicKey || subscribed || permission !== "default") return null;

  const className =
    variant === "mobile"
      ? "md:hidden fixed right-4 bottom-20 z-50 flex items-center justify-center w-11 h-11 transition-opacity hover:opacity-80 disabled:opacity-50"
      : "hidden md:flex items-center justify-center w-10 h-10 transition-opacity hover:opacity-80 disabled:opacity-50";

  return (
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
  );
}
