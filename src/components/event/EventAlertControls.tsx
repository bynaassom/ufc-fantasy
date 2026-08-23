"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import { readApiResponse } from "@/lib/api";
import { requestBrowserPushForAlert } from "@/lib/browser-push";

type AlertState = {
  eventSubscribed: boolean;
  fightIds: string[];
};

type AlertContextValue = {
  state: AlertState;
  loading: boolean;
  busyKey: string | null;
  disabled: boolean;
  toggleEvent: () => Promise<void>;
  toggleFight: (fightId: string) => Promise<void>;
};

const EMPTY_STATE: AlertState = { eventSubscribed: false, fightIds: [] };
const AlertContext = createContext<AlertContextValue | null>(null);

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3a4 4 0 0 0-4 4v2.5L6.4 12.7A2 2 0 0 0 8.2 15.6h7.6a2 2 0 0 0 1.8-2.9L16 9.5V7a4 4 0 0 0-4-4Z" />
      <path d="M10 19a2 2 0 0 0 4 0" fill="none" />
    </svg>
  );
}

export function EventAlertProvider({
  eventSlug,
  disabled,
  children,
}: {
  eventSlug: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState<AlertState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/${eventSlug}/alerts`)
      .then((response) => readApiResponse<AlertState>(response))
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventSlug]);

  const mutate = useCallback(
    async (scope: "event" | "fight", fightId: string | null, enabled: boolean) => {
      const key = fightId || "event";
      setBusyKey(key);
      try {
        const next = await readApiResponse<AlertState>(
          await fetch(`/api/events/${eventSlug}/alerts`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scope, fightId, enabled }),
          }),
        );
        setState(next);

        if (enabled) {
          toast.success(scope === "event" ? "Avisos de todas as lutas ativados." : "Aviso da luta ativado.");
          try {
            const push = await requestBrowserPushForAlert();
            if (push === "denied") {
              toast("Aviso salvo no app. O push está bloqueado no navegador.");
            } else if (push === "unsupported" || push === "disabled") {
              toast("Aviso salvo no app; push indisponível neste dispositivo.");
            }
          } catch (error) {
            console.error(error);
            toast("Aviso salvo no app; não foi possível ativar o push.");
          }
        } else {
          toast.success(scope === "event" ? "Avisos do evento desativados." : "Aviso da luta desativado.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Não foi possível atualizar o aviso.");
      } finally {
        setBusyKey(null);
      }
    },
    [eventSlug],
  );

  const value = useMemo<AlertContextValue>(
    () => ({
      state,
      loading,
      busyKey,
      disabled,
      toggleEvent: () => mutate("event", null, !state.eventSubscribed),
      toggleFight: (fightId) =>
        mutate("fight", fightId, !state.fightIds.includes(fightId)),
    }),
    [busyKey, disabled, loading, mutate, state],
  );

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

function useEventAlerts() {
  const context = useContext(AlertContext);
  if (!context) throw new Error("Event alert control used outside its provider.");
  return context;
}

export function EventAlertButton() {
  const { state, loading, busyKey, disabled, toggleEvent } = useEventAlerts();
  if (disabled) return null;
  const active = state.eventSubscribed;
  const busy = loading || busyKey === "event";

  return (
    <button
      type="button"
      onClick={() => void toggleEvent()}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? "Desativar avisos de todas as lutas" : "Ativar avisos de todas as lutas"}
      className="min-tap inline-flex shrink-0 items-center justify-center gap-2 px-3 py-2 font-condensed text-[11px] font-900 uppercase tracking-widest transition-colors disabled:opacity-50"
      style={{
        color: active ? "white" : "var(--text-secondary)",
        backgroundColor: active ? "var(--red)" : "var(--bg-card)",
        border: `1px solid ${active ? "var(--red)" : "var(--border)"}`,
      }}
      title={active ? "Avisos de todas as lutas ativos" : "Receber avisos de todas as lutas"}
    >
      <BellIcon active={active} />
      <span className="hidden sm:inline">{active ? "Avisos ativos" : "Avisar lutas"}</span>
    </button>
  );
}

export function FightAlertButton({ fightId, completed }: { fightId: string; completed: boolean }) {
  const { state, loading, busyKey, disabled, toggleFight } = useEventAlerts();
  if (completed || disabled) return null;
  const inherited = state.eventSubscribed;
  const explicitlyActive = state.fightIds.includes(fightId);
  const active = inherited || explicitlyActive;
  const busy = loading || busyKey === fightId;
  const label = inherited
    ? "Aviso ativo pelo evento"
    : explicitlyActive
      ? "Desativar aviso desta luta"
      : "Avisar quando esta luta for começar";

  return (
    <button
      type="button"
      onClick={() => void toggleFight(fightId)}
      disabled={busy || inherited}
      aria-pressed={active}
      aria-label={label}
      className="min-tap inline-flex h-8 w-8 items-center justify-center transition-colors disabled:opacity-60"
      style={{
        color: active ? "var(--red)" : "var(--text-muted)",
        backgroundColor: active ? "rgba(232,0,26,0.10)" : "transparent",
        border: `1px solid ${active ? "rgba(232,0,26,0.35)" : "var(--border)"}`,
      }}
      title={label}
    >
      <BellIcon active={active} />
    </button>
  );
}
