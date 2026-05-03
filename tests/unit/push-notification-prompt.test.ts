import {
  PUSH_PROMPT_SNOOZE_MS,
  getNextPushPromptDismissedUntil,
  shouldShowPushNotificationPrompt,
} from "@/lib/push-notification-prompt";

describe("push notification prompt", () => {
  it("shows the prompt only when push is configured, unsubscribed and permission is default", () => {
    const now = new Date("2026-05-03T12:00:00.000Z").getTime();

    expect(
      shouldShowPushNotificationPrompt({
        publicKey: "public-key",
        subscribed: false,
        permission: "default",
        dismissedUntil: null,
        now,
      }),
    ).toBe(true);

    expect(
      shouldShowPushNotificationPrompt({
        publicKey: null,
        subscribed: false,
        permission: "default",
        dismissedUntil: null,
        now,
      }),
    ).toBe(false);

    expect(
      shouldShowPushNotificationPrompt({
        publicKey: "public-key",
        subscribed: true,
        permission: "default",
        dismissedUntil: null,
        now,
      }),
    ).toBe(false);

    expect(
      shouldShowPushNotificationPrompt({
        publicKey: "public-key",
        subscribed: false,
        permission: "denied",
        dismissedUntil: null,
        now,
      }),
    ).toBe(false);
  });

  it("respects a dismissed prompt until the snooze window expires", () => {
    const now = new Date("2026-05-03T12:00:00.000Z").getTime();

    expect(
      shouldShowPushNotificationPrompt({
        publicKey: "public-key",
        subscribed: false,
        permission: "default",
        dismissedUntil: now + 1000,
        now,
      }),
    ).toBe(false);

    expect(
      shouldShowPushNotificationPrompt({
        publicKey: "public-key",
        subscribed: false,
        permission: "default",
        dismissedUntil: now - 1000,
        now,
      }),
    ).toBe(true);
  });

  it("snoozes the prompt for seven days", () => {
    const now = new Date("2026-05-03T12:00:00.000Z").getTime();

    expect(getNextPushPromptDismissedUntil(now)).toBe(now + PUSH_PROMPT_SNOOZE_MS);
  });
});
