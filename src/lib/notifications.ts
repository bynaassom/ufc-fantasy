export type UfcNotificationType =
  | "challenge_received"
  | "challenge_accepted"
  | "challenge_declined"
  | "challenge_result"
  | "picks_opened"
  | "picks_closing_tomorrow"
  | "picks_closing_today"
  | "picks_closing_1h"
  | "picks_closing_30m"
  | "picks_closing_15m"
  | "picks_closed"
  | "fight_removed"
  | "fight_added"
  | "card_updated"
  | "perfect_pick";

export type PickReminderType = Extract<
  UfcNotificationType,
  | "picks_closing_tomorrow"
  | "picks_closing_today"
  | "picks_closing_1h"
  | "picks_closing_30m"
  | "picks_closing_15m"
>;

type NotificationEvent = {
  id: string;
  name: string;
  slug?: string;
  picks_open_at?: string | null;
  picks_lock_at?: string | null;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
};

type DateTimeParts = DateParts & {
  hour: number;
  minute: number;
  second: number;
};

type NotificationContentInput = {
  type: UfcNotificationType;
  eventName: string;
  fightName?: string;
};

type DedupeKeyInput = {
  type: UfcNotificationType;
  eventId: string;
  fightId?: string | null;
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const CRON_WINDOW_MS = 5 * MINUTE_MS;
const CALENDAR_REMINDER_HOUR = 12;
const APP_TIME_ZONE = "America/Sao_Paulo";

const DATE_TIME_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function toTime(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isPicksOpenAt(nowMs: number, event: NotificationEvent) {
  const openAt = toTime(event.picks_open_at);
  return openAt === null || nowMs >= openAt;
}

function getDateTimeParts(date: Date): DateTimeParts {
  const parts = DATE_TIME_PARTS_FORMATTER.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) =>
        ["year", "month", "day", "hour", "minute", "second"].includes(part.type),
      )
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getDateParts(date: Date): DateParts {
  const { year, month, day } = getDateTimeParts(date);
  return { year, month, day };
}

function getUtcDateFromParts(parts: DateParts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function getCalendarDayDiff(left: Date, right: Date) {
  const leftDay = getUtcDateFromParts(getDateParts(left));
  const rightDay = getUtcDateFromParts(getDateParts(right));
  return Math.round((rightDay - leftDay) / (24 * HOUR_MS));
}

function isWithinCronReminderWindow(remainingMs: number, targetMs: number) {
  return remainingMs <= targetMs && remainingMs > targetMs - CRON_WINDOW_MS;
}

function isWithinCalendarReminderWindow(date: Date) {
  const { hour, minute, second } = getDateTimeParts(date);
  const localMs =
    ((hour * 60 + minute) * 60 + second) * 1000 + date.getMilliseconds();
  const startMs = CALENDAR_REMINDER_HOUR * HOUR_MS;

  return localMs >= startMs && localMs < startMs + CRON_WINDOW_MS;
}

export function isPicksOpenedNotificationDue({
  now,
  event,
}: {
  now: Date;
  event: NotificationEvent;
}) {
  const lockAt = toTime(event.picks_lock_at);
  const openAt = toTime(event.picks_open_at);
  const nowMs = now.getTime();

  if (openAt === null || lockAt === null) return false;
  return nowMs >= openAt && nowMs < lockAt && nowMs <= openAt + HOUR_MS;
}

export function isPicksClosedNotificationDue({
  now,
  event,
}: {
  now: Date;
  event: NotificationEvent;
}) {
  const lockAt = toTime(event.picks_lock_at);
  const nowMs = now.getTime();

  if (lockAt === null || !isPicksOpenAt(nowMs, event)) return false;
  return nowMs >= lockAt && nowMs < lockAt + CRON_WINDOW_MS;
}

export function getDuePickReminderTypes({
  now,
  event,
}: {
  now: Date;
  event: NotificationEvent;
}): PickReminderType[] {
  const nowMs = now.getTime();
  const lockAt = toTime(event.picks_lock_at);
  const openAt = toTime(event.picks_open_at);

  if (lockAt === null || !isPicksOpenAt(nowMs, event)) return [];

  const remainingMs = lockAt - nowMs;
  if (remainingMs <= 0) return [];

  if (isWithinCronReminderWindow(remainingMs, 15 * MINUTE_MS)) {
    return ["picks_closing_15m"];
  }
  if (remainingMs <= 15 * MINUTE_MS) return [];

  if (isWithinCronReminderWindow(remainingMs, 30 * MINUTE_MS)) {
    return ["picks_closing_30m"];
  }
  if (remainingMs <= 30 * MINUTE_MS) return [];

  if (isWithinCronReminderWindow(remainingMs, HOUR_MS)) {
    return ["picks_closing_1h"];
  }
  if (remainingMs <= HOUR_MS) return [];

  if (openAt !== null && nowMs <= openAt + HOUR_MS) return [];
  if (!isWithinCalendarReminderWindow(now)) return [];

  const dayDiff = getCalendarDayDiff(now, new Date(lockAt));
  if (dayDiff === 0) return ["picks_closing_today"];
  if (dayDiff === 1) return ["picks_closing_tomorrow"];

  return [];
}

export function buildNotificationContent({
  type,
  eventName,
  fightName,
}: NotificationContentInput) {
  const displayFightName = fightName || "essa luta";

  switch (type) {
    case "picks_opened":
      return {
        title: "Picks abertos",
        message: `O card do ${eventName} ta liberado. Bora cravar seus picks?`,
      };
    case "picks_closing_tomorrow":
      return {
        title: "Fecham amanha",
        message: `E ai, ja deu aquela olhada no ${eventName}? Seus picks fecham amanha.`,
      };
    case "picks_closing_today":
      return {
        title: "Fecham hoje",
        message: `Dia de fechar pick: seus palpites para ${eventName} encerram hoje.`,
      };
    case "picks_closing_1h":
      return {
        title: "So 1 hora",
        message: "Ta na hora de decidir: seus picks fecham em 1 hora.",
      };
    case "picks_closing_30m":
      return {
        title: "Ultima chamada",
        message: "Ultima chamada pro octogono: seus picks fecham em 30 minutos.",
      };
    case "picks_closing_15m":
      return {
        title: "So 15 minutos",
        message: "E ai, ja fez seus picks? Faltam so 15 minutos pra fechar, hein.",
      };
    case "picks_closed":
      return {
        title: "Picks fechados",
        message: `Acabou o tempo! Os picks do ${eventName} fecharam.`,
      };
    case "fight_removed":
      return {
        title: "Ih, deu ruim",
        message: `A luta ${displayFightName} caiu do card do ${eventName}.`,
      };
    case "fight_added":
      return {
        title: "Luta nova no card",
        message: `Entrou ${displayFightName} no ${eventName}. Bora ajustar os palpites?`,
      };
    case "card_updated":
      return {
        title: "Card atualizado",
        message: `O card do ${eventName} mudou. Da uma conferida antes de cravar seus picks.`,
      };
    case "perfect_pick":
      return {
        title: "Cravada!",
        message: `Voce cravou ${displayFightName} no ${eventName}: vencedor, metodo e round. Ai sim!`,
      };
    default:
      return {
        title: "Notificacao",
        message: `Tem novidade no ${eventName}.`,
      };
  }
}

export function buildNotificationDedupeKey({
  type,
  eventId,
  fightId,
}: DedupeKeyInput) {
  return [type, eventId, fightId].filter(Boolean).join(":");
}

export function filterUsersWithoutConfirmedPicks({
  profiles,
  picks,
  eventId,
}: {
  profiles: Array<{ id: string; is_banned?: boolean | null }>;
  picks: Array<{
    user_id: string;
    event_id: string;
    is_confirmed?: boolean | null;
  }>;
  eventId: string;
}) {
  const usersWithConfirmedPicks = new Set(
    picks
      .filter((pick) => pick.event_id === eventId && pick.is_confirmed)
      .map((pick) => pick.user_id),
  );

  return profiles
    .filter((profile) => !profile.is_banned)
    .filter((profile) => !usersWithConfirmedPicks.has(profile.id))
    .map((profile) => profile.id);
}
