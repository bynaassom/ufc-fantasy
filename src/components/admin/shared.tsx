"use client";

import { readApiResponse } from "@/lib/api";
import type { EventEditForm } from "./types";

export const WEIGHT_CLASSES = [
  "Heavyweight",
  "LightHeavyweight",
  "Middleweight",
  "Welterweight",
  "Lightweight",
  "Featherweight",
  "Bantamweight",
  "Flyweight",
  "Strawweight",
  "Atomweight",
  "Catchweight",
];

export const CARD_TYPES = [
  { value: "main", label: "Main Card" },
  { value: "preliminary", label: "Preliminares" },
];

export const inp: React.CSSProperties = {
  backgroundColor: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  padding: "10px 14px",
  fontSize: "14px",
  transition: "border-color 0.15s",
};

export const sel: React.CSSProperties = { ...inp, cursor: "pointer" };

export const lbl =
  "block text-xs font-condensed font-700 uppercase tracking-widest mb-1.5";

export const focus = (
  e: React.FocusEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >,
) => (e.target.style.borderColor = "var(--red)");

export const blur = (
  e: React.FocusEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >,
) => (e.target.style.borderColor = "var(--border)");

export function formatAdminDateTime(value?: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function toEventEditForm(data: any): EventEditForm {
  return {
    name: data?.name || "",
    location: data?.location || "",
    event_date: data?.event_date ? data.event_date.slice(0, 16) : "",
    prelims_start_at: data?.prelims_start_at ? data.prelims_start_at.slice(0, 16) : "",
    timing_mode: data?.timing_mode || "automatic",
    picks_lock_at: data?.picks_lock_at ? data.picks_lock_at.slice(0, 16) : "",
    picks_open_at: data?.picks_open_at ? data.picks_open_at.slice(0, 16) : "",
    banner_image_url: data?.banner_image_url || "",
    banner_object_position: data?.banner_object_position || "center",
    ufc_event_id: data?.ufc_event_id || "",
    ufc_stats_url: data?.ufc_stats_url || "",
    espn_fightcenter_url: data?.espn_fightcenter_url || "",
    sherdog_event_url: data?.sherdog_event_url || "",
    tapology_event_url: data?.tapology_event_url || "",
    status: data?.status || "upcoming",
  };
}

export function hasDatePassed(value?: string | null) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

export function areEventPicksOpen(event: {
  picks_open_at?: string | null;
  picks_lock_at?: string | null;
}) {
  const open = !event.picks_open_at || hasDatePassed(event.picks_open_at);
  const locked = !!event.picks_lock_at && hasDatePassed(event.picks_lock_at);
  return open && !locked;
}

export function getBulkActionLabel(
  action: "open_now" | "close_now" | "reset_default" | "set_offsets" | "set_status",
) {
  const labels = {
    open_now: "abrir picks agora",
    close_now: "fechar picks agora",
    reset_default: "resetar a janela padrão",
    set_offsets: "aplicar offsets customizados",
    set_status: "alterar o status",
  };
  return labels[action];
}

export function getBulkActionWarning(
  action: "open_now" | "close_now" | "reset_default" | "set_offsets" | "set_status",
  selectedCount: number,
) {
  const eventLabel = selectedCount === 1 ? "evento" : "eventos";
  return `Confirma ${getBulkActionLabel(action)} em ${selectedCount} ${eventLabel}?`;
}

export function AdminEmptyState({ text }: { text: string }) {
  return (
    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
      {text}
    </p>
  );
}

export async function adminGet<T>(url: string) {
  return readApiResponse<T>(
    await fetch(url, {
      cache: "no-store",
    }),
  );
}

export async function adminSend<T>(url: string, init: RequestInit) {
  return readApiResponse<T>(
    await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    }),
  );
}
