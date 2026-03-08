import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEventDate(date: string) {
  return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatEventTime(date: string) {
  return format(new Date(date), "HH:mm");
}

export function timeUntilEvent(date: string) {
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
}

export function isPicksLocked(lockAt: string): boolean {
  return isBefore(new Date(lockAt), new Date());
}

export function isPicksOpen(picksOpenAt: string | null): boolean {
  if (!picksOpenAt) return true; // null = sempre aberto
  return isBefore(new Date(picksOpenAt), new Date());
}

export function timeUntilPicksOpen(picksOpenAt: string): string {
  return formatDistanceToNow(new Date(picksOpenAt), {
    locale: ptBR,
    addSuffix: true,
  });
}

export function getMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    decision: "Decisão",
    submission: "Finalização",
    knockout: "Nocaute",
  };
  return labels[method] || method;
}

export function getMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    decision: "⚖️",
    submission: "🤼",
    knockout: "👊",
  };
  return icons[method] || "❓";
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
