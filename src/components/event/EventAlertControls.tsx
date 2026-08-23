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

type AlertPreferences = {
  upNext: boolean;
  starting: boolean;
  results: boolean;
};

type AlertState = {
  eventSubscription: AlertPreferences | null;
  fightSubscriptions: Record<string, AlertPreferences>;
};

type ComposerTarget = {
  scope: "event" | "fight";
  fightId: string | null;
  label: string;
};

type AlertContextValue = {
  state: AlertState;
  loading: boolean;
  busy: boolean;
  disabled: boolean;
  openComposer: (target: ComposerTarget) => void;
};

const DEFAULT_PREFERENCES: AlertPreferences = {
  upNext: true,
  starting: true,
  results: false,
};
const EMPTY_STATE: AlertState = {
  eventSubscription: null,
  fightSubscriptions: {},
};
const AlertContext = createContext<AlertContextValue | null>(null);

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3a4 4 0 0 0-4 4v2.5L6.4 12.7A2 2 0 0 0 8.2 15.6h7.6a2 2 0 0 0 1.8-2.9L16 9.5V7a4 4 0 0 0-4-4Z" />
      <path d="M10 19a2 2 0 0 0 4 0" fill="none" />
    </svg>
  );
}

function PreferenceRow({ checked, onChange, title, description, spoiler }: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
  spoiler?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 border-t px-4 py-4 transition-colors hover:bg-white/[0.025]" style={{ borderColor: "var(--border)" }}>
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 accent-[var(--red)]" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-condensed text-sm font-900 uppercase tracking-wide text-[var(--text)]">{title}</span>
          {spoiler && (
            <span className="border border-[rgba(232,0,26,0.45)] px-1.5 py-0.5 font-condensed text-[9px] font-900 uppercase tracking-widest text-[var(--red)]">
              contém spoiler
            </span>
          )}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-[var(--text-muted)]">{description}</span>
      </span>
    </label>
  );
}

export function EventAlertProvider({ eventSlug, eventName, disabled, publicMode = false, children }: {
  eventSlug: string;
  eventName: string;
  disabled: boolean;
  publicMode?: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState<AlertState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<ComposerTarget | null>(null);
  const [preferences, setPreferences] = useState<AlertPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/${eventSlug}/alerts`)
      .then((response) => readApiResponse<AlertState>(response))
      .then((next) => { if (!cancelled) setState(next); })
      .catch((error) => console.error(error))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [eventSlug]);

  useEffect(() => {
    if (!target) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setTarget(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [busy, target]);

  const openComposer = useCallback((nextTarget: ComposerTarget) => {
    const current = nextTarget.scope === "event"
      ? state.eventSubscription
      : state.fightSubscriptions[nextTarget.fightId!];
    setPreferences(current || DEFAULT_PREFERENCES);
    setTarget(nextTarget);
  }, [state]);

  const mutate = useCallback(async (enabled: boolean) => {
    if (!target) return;
    setBusy(true);
    try {
      const next = await readApiResponse<AlertState>(
        await fetch(`/api/events/${eventSlug}/alerts`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope: target.scope,
            fightId: target.fightId,
            enabled,
            preferences: enabled ? preferences : undefined,
          }),
        }),
      );
      setState(next);
      setTarget(null);

      if (!enabled) {
        toast.success(target.scope === "event" ? "Companion desativado para o evento." : "Alertas desta luta desativados.");
        return;
      }

      toast.success(target.scope === "event" ? "Modo Companion ativado." : "Alertas da luta salvos.");
      try {
        const push = await requestBrowserPushForAlert();
        if (push === "denied") {
          toast(
            publicMode
              ? "Preferência salva, mas as notificações estão bloqueadas no navegador."
              : "Alerta salvo no app. O push está bloqueado no navegador.",
          );
        } else if (push === "unsupported" || push === "disabled") {
          toast(
            publicMode
              ? "Preferência salva, mas este dispositivo não oferece push."
              : "Alerta salvo no app; push indisponível neste dispositivo.",
          );
        }
      } catch (error) {
        console.error(error);
        toast("Alerta salvo no app; não foi possível ativar o push.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível atualizar os alertas.");
    } finally {
      setBusy(false);
    }
  }, [eventSlug, preferences, publicMode, target]);

  const activeSubscription = target
    ? target.scope === "event"
      ? state.eventSubscription
      : state.fightSubscriptions[target.fightId!]
    : null;
  const hasPreference = preferences.upNext || preferences.starting || preferences.results;
  const value = useMemo<AlertContextValue>(
    () => ({ state, loading, busy, disabled, openComposer }),
    [busy, disabled, loading, openComposer, state],
  );

  return (
    <AlertContext.Provider value={value}>
      {children}
      {target && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setTarget(null); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="companion-title" className="w-full max-w-md border bg-[var(--bg-card)] shadow-2xl" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-start justify-between gap-5 p-5">
              <div>
                <p className="mb-2 font-condensed text-[10px] font-900 uppercase tracking-[0.24em] text-[var(--red)]">Modo Companion</p>
                <h2 id="companion-title" className="font-condensed text-2xl font-900 uppercase leading-none text-[var(--text)]">
                  {target.scope === "event" ? eventName : target.label}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                  {target.scope === "event" ? "Configure uma vez e acompanhe todas as lutas deste card." : "Escolha exatamente o que deseja saber sobre esta luta."}
                </p>
              </div>
              <button type="button" onClick={() => setTarget(null)} disabled={busy} aria-label="Fechar" className="min-tap shrink-0 text-2xl leading-none text-[var(--text-muted)] hover:text-[var(--text)]">×</button>
            </div>

            {target.scope === "fight" && state.eventSubscription && (
              <p className="mx-4 mb-3 border-l-2 border-[var(--red)] bg-[rgba(232,0,26,0.08)] px-3 py-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                O Companion do evento também está ativo. Estas escolhas adicionam preferências específicas para a luta.
              </p>
            )}

            <div>
              <PreferenceRow checked={preferences.upNext} onChange={() => setPreferences((current) => ({ ...current, upNext: !current.upNext }))} title="É a próxima" description="Avisamos quando esta luta entrar como próxima no card." />
              <PreferenceRow checked={preferences.starting} onChange={() => setPreferences((current) => ({ ...current, starting: !current.starting }))} title="Está começando" description="Receba um alerta nas entradas, apresentações ou início da luta." />
              <PreferenceRow checked={preferences.results} onChange={() => setPreferences((current) => ({ ...current, results: !current.results }))} title="Resultado" description="Enviamos vencedor, método e round assim que forem confirmados." spoiler />
            </div>

            <div className="flex items-center gap-3 border-t p-4" style={{ borderColor: "var(--border)" }}>
              {activeSubscription && (
                <button type="button" onClick={() => void mutate(false)} disabled={busy} className="min-tap px-2 font-condensed text-[10px] font-900 uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-50">Desativar</button>
              )}
              <button type="button" onClick={() => void mutate(true)} disabled={busy || !hasPreference} className="min-tap ml-auto bg-[var(--red)] px-5 py-3 font-condensed text-xs font-900 uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-40">
                {busy ? "Salvando…" : activeSubscription ? "Salvar alertas" : "Ativar Companion"}
              </button>
            </div>
          </section>
        </div>
      )}
    </AlertContext.Provider>
  );
}

function useEventAlerts() {
  const context = useContext(AlertContext);
  if (!context) throw new Error("Event alert control used outside its provider.");
  return context;
}

export function EventAlertButton() {
  const { state, loading, busy, disabled, openComposer } = useEventAlerts();
  if (disabled) return null;
  const active = Boolean(state.eventSubscription);

  return (
    <button type="button" onClick={() => openComposer({ scope: "event", fightId: null, label: "Evento" })} disabled={loading || busy} aria-pressed={active} aria-label={active ? "Configurar Companion do evento" : "Ativar Companion para o evento"} className="min-tap inline-flex shrink-0 items-center justify-center gap-2 px-3 py-2 font-condensed text-[11px] font-900 uppercase tracking-widest transition-colors disabled:opacity-50" style={{ color: active ? "white" : "var(--text-secondary)", backgroundColor: active ? "var(--red)" : "var(--bg-card)", border: `1px solid ${active ? "var(--red)" : "var(--border)"}` }} title={active ? "Configurar Modo Companion" : "Acompanhar todas as lutas"}>
      <BellIcon active={active} />
      <span>{active ? "Acompanhando" : "Modo Companion"}</span>
    </button>
  );
}

export function FightAlertButton({ fightId, fightName, completed }: { fightId: string; fightName: string; completed: boolean }) {
  const { state, loading, busy, disabled, openComposer } = useEventAlerts();
  if (completed || disabled) return null;
  const inherited = Boolean(state.eventSubscription);
  const explicitlyActive = Boolean(state.fightSubscriptions[fightId]);
  const active = inherited || explicitlyActive;

  return (
    <button type="button" onClick={() => openComposer({ scope: "fight", fightId, label: fightName })} disabled={loading || busy} aria-pressed={active} aria-label={active ? `Configurar alertas de ${fightName}` : `Acompanhar ${fightName}`} className="min-tap inline-flex h-8 w-8 items-center justify-center transition-colors disabled:opacity-60" style={{ color: active ? "var(--red)" : "var(--text-muted)", backgroundColor: active ? "rgba(232,0,26,0.10)" : "transparent", border: `1px solid ${active ? "rgba(232,0,26,0.35)" : "var(--border)"}` }} title={active ? "Configurar alertas desta luta" : "Acompanhar esta luta"}>
      <BellIcon active={active} />
    </button>
  );
}
