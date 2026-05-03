export const PUSH_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export const PUSH_PROMPT_DISMISSED_UNTIL_KEY =
  "ufc-fantasy:push-prompt-dismissed-until";

export function shouldShowPushNotificationPrompt({
  publicKey,
  subscribed,
  permission,
  dismissedUntil,
  now,
}: {
  publicKey: string | null;
  subscribed: boolean;
  permission: NotificationPermission;
  dismissedUntil: number | null;
  now: number;
}) {
  if (!publicKey || subscribed || permission !== "default") return false;
  return dismissedUntil === null || dismissedUntil <= now;
}

export function getNextPushPromptDismissedUntil(now: number) {
  return now + PUSH_PROMPT_SNOOZE_MS;
}

export function readPushPromptDismissedUntil(storage: Storage) {
  const value = Number(storage.getItem(PUSH_PROMPT_DISMISSED_UNTIL_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function writePushPromptDismissedUntil(storage: Storage, now: number) {
  const dismissedUntil = getNextPushPromptDismissedUntil(now);
  storage.setItem(PUSH_PROMPT_DISMISSED_UNTIL_KEY, String(dismissedUntil));
  return dismissedUntil;
}
