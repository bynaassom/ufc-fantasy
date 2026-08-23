"use client";

import { readApiResponse } from "@/lib/api";
import type {
  PushSubscriptionResponse,
  VapidPublicKeyResponse,
} from "@/types/api";

export function isBrowserPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getBrowserPushPermission() {
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
    throw new Error("Inscrição push inválida.");
  }

  await readApiResponse<PushSubscriptionResponse>(
    await fetch("/api/me/push-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscriptionJson.endpoint,
        keys: subscriptionJson.keys,
      }),
    }),
  );
}

async function getOrCreateSubscription(publicKey: string) {
  const registration = await navigator.serviceWorker.register("/sw.js");
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

export async function getBrowserPushPublicKey() {
  const data = await readApiResponse<VapidPublicKeyResponse>(
    await fetch("/api/push/vapid-public-key"),
  );
  return data.enabled ? data.publicKey : null;
}

export async function ensureBrowserPushSubscription(
  publicKey: string,
  shouldAskPermission: boolean,
) {
  if (!isBrowserPushSupported()) return "unsupported" as const;

  let permission = getBrowserPushPermission();
  if (permission === "default" && shouldAskPermission) {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return permission as "default" | "denied";

  const subscription = await getOrCreateSubscription(publicKey);
  await saveSubscription(subscription);
  return "subscribed" as const;
}

export async function requestBrowserPushForAlert() {
  if (!isBrowserPushSupported()) return "unsupported" as const;
  const publicKey = await getBrowserPushPublicKey();
  if (!publicKey) return "disabled" as const;
  return ensureBrowserPushSubscription(publicKey, true);
}
