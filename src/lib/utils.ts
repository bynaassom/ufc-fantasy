const eventDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat("pt-BR", {
  numeric: "always",
});

const RELATIVE_TIME_UNITS = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
] as const;

export function formatRelativeTime(date: string | Date, now = new Date()) {
  const target = typeof date === "string" ? new Date(date) : date;
  const deltaSeconds = (target.getTime() - now.getTime()) / 1000;
  const absoluteSeconds = Math.abs(deltaSeconds);
  const [unit, secondsPerUnit] =
    RELATIVE_TIME_UNITS.find(([, seconds]) => absoluteSeconds >= seconds) ||
    RELATIVE_TIME_UNITS[RELATIVE_TIME_UNITS.length - 1];

  return relativeTimeFormatter.format(
    Math.round(deltaSeconds / secondsPerUnit),
    unit,
  );
}

export function formatEventDate(date: string) {
  return eventDateFormatter.format(new Date(date));
}

export function timeUntilEvent(date: string) {
  return formatRelativeTime(date);
}

export function isPicksLocked(lockAt: string): boolean {
  return new Date(lockAt).getTime() < Date.now();
}

export function isPicksOpen(picksOpenAt: string | null): boolean {
  if (!picksOpenAt) return true; // null = sempre aberto
  return new Date(picksOpenAt).getTime() < Date.now();
}

export function timeUntilPicksOpen(picksOpenAt: string): string {
  return formatRelativeTime(picksOpenAt);
}

export function getHomePicksStatusLabel({
  picksOpenAt,
  picksLockAt,
}: {
  picksOpenAt: string | null;
  picksLockAt: string;
}): string {
  if (!isPicksOpen(picksOpenAt) && picksOpenAt) {
    return `PICKS ABREM ${timeUntilPicksOpen(picksOpenAt).toUpperCase()}`;
  }

  if (isPicksLocked(picksLockAt)) {
    return "PICKS ENCERRADOS";
  }

  return `PICKS FECHAM ${timeUntilEvent(picksLockAt).toUpperCase()}`;
}

export function getFightCardUnavailablePicksLabel({
  picksOpen,
}: {
  picksOpen: boolean;
}): string {
  return picksOpen ? "PICKS ENCERRADOS" : "PICKS FECHADOS";
}

export function getMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    decision: "Decisão",
    submission: "Finalização",
    knockout: "Nocaute",
  };
  return labels[method] || method;
}

export function getFallbackHeadshot(name: string): string {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=1a1a1a&color=EF4444&size=200&bold=true`;
}

// Retorna o nome de exibição: nickname se existir, senão "Nome Sobrenome"
export function getDisplayName(profile: {
  nickname?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  if (profile.nickname?.trim()) return profile.nickname.trim();
  return (
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Usuário"
  );
}

// Retorna o subtítulo: se tem nickname, mostra "Nome Sobrenome". Senão, nada.
export function getDisplaySubtitle(profile: {
  nickname?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string | null {
  if (!profile.nickname?.trim()) return null;
  return (
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null
  );
}
