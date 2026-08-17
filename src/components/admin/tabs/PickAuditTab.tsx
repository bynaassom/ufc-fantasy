"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { adminGet, formatAdminDateTime, lbl, sel } from "../shared";

type Fighter = { id: string; name: string };
type Fight = {
  id: string;
  fighter_a_id: string;
  fighter_b_id: string;
  fight_order: number;
  card_type: string;
  weight_class: string;
  fighter_a: Fighter | Fighter[] | null;
  fighter_b: Fighter | Fighter[] | null;
};

type AuditAttempt = {
  id: string;
  request_id: string;
  client_request_id: string | null;
  status: "received" | "saved" | "rejected";
  source: string;
  pick_count: number;
  received_at: string;
  completed_at: string | null;
  client_saved_at: string | null;
  error_code: string | null;
  error_message: string | null;
  user_agent: string | null;
};

type VersionData = {
  picked_winner_id?: string;
  picked_method?: string;
  picked_round?: number;
  client_selected_at?: string;
  is_confirmed?: boolean;
  confirmed_at?: string;
};

type AuditVersion = {
  id: string;
  pick_id: string;
  fight_id: string;
  operation: "insert" | "update" | "delete" | "snapshot";
  before_data: VersionData | null;
  after_data: VersionData | null;
  changed_fields: string[];
  request_id: string | null;
  source: string;
  occurred_at: string;
  fight: Fight | null;
};

type CurrentPick = VersionData & {
  id: string;
  fight_id: string;
  created_at: string;
  updated_at: string;
  last_save_request_id: string | null;
  last_save_source: string | null;
  fight: Fight | null;
};

type PickAuditResponse = {
  subject: {
    user: { id: string; nickname: string; first_name: string; last_name: string };
    event: {
      id: string;
      name: string;
      status: string;
      event_date: string;
      picks_lock_at: string;
    };
  };
  summary: {
    currentPickCount: number;
    totalFights: number;
    coveragePercent: number;
    firstSaveAt: string | null;
    lastSaveAt: string | null;
    savedAttempts: number;
    rejectedAttempts: number;
    decisionChanges: number;
    lastSaveTiming: "before_lock" | "after_lock" | "unknown";
    lastSaveOffsetSeconds: number | null;
  };
  currentPicks: CurrentPick[];
  attempts: AuditAttempt[];
  versions: AuditVersion[];
  auditStartedAt: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  decision: "Decisão",
  submission: "Finalização",
  knockout: "Nocaute",
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function fightLabel(fight: Fight | null) {
  if (!fight) return "Luta removida ou não encontrada";
  return `${one(fight.fighter_a)?.name || "A definir"} × ${one(fight.fighter_b)?.name || "A definir"}`;
}

function winnerLabel(data: VersionData | null, fight: Fight | null) {
  if (!data?.picked_winner_id) return "—";
  if (data.picked_winner_id === fight?.fighter_a_id) {
    return one(fight.fighter_a)?.name || "Lutador A";
  }
  if (data.picked_winner_id === fight?.fighter_b_id) {
    return one(fight.fighter_b)?.name || "Lutador B";
  }
  return data.picked_winner_id.slice(0, 8);
}

function pickLabel(data: VersionData | null, fight: Fight | null) {
  if (!data) return "Sem pick";
  return `${winnerLabel(data, fight)} · ${METHOD_LABELS[data.picked_method || ""] || data.picked_method || "—"} · R${data.picked_round || "—"}`;
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "—";
}

function formatOffset(seconds: number | null, timing: string) {
  if (seconds === null || timing === "unknown") return "Horário de corte indisponível";
  const absolute = Math.abs(seconds);
  const hours = Math.floor(absolute / 3600);
  const minutes = Math.floor((absolute % 3600) / 60);
  const value = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  return timing === "before_lock" ? `${value} antes do fechamento` : `${value} após o fechamento`;
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="min-w-0 p-4" style={{ borderRight: "1px solid var(--border)" }}>
      <p className="font-condensed text-2xl font-900 leading-none" style={{ color: "var(--text)" }}>
        {value}
      </p>
      <p className="mt-1 text-[11px] font-condensed font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      {detail && <p className="mt-1 truncate text-xs" title={detail} style={{ color: "var(--text-secondary)" }}>{detail}</p>}
    </div>
  );
}

export default function PickAuditTab({
  events,
  users,
  selectedEventId,
  setSelectedEventId,
}: {
  events: any[];
  users: any[];
  selectedEventId: string;
  setSelectedEventId: (value: string) => void;
}) {
  const [userId, setUserId] = useState(users[0]?.id || "");
  const [audit, setAudit] = useState<PickAuditResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => String(a.nickname || "").localeCompare(String(b.nickname || ""))),
    [users],
  );
  const requestIdsWithVersions = useMemo(
    () => new Set((audit?.versions || []).map((version) => version.request_id).filter(Boolean)),
    [audit],
  );

  async function loadAudit() {
    if (!userId || !selectedEventId) {
      toast.error("Selecione um usuário e um evento.");
      return;
    }
    setLoading(true);
    try {
      const result = await adminGet<PickAuditResponse>(
        `/api/admin/pick-audit?userId=${encodeURIComponent(userId)}&eventId=${encodeURIComponent(selectedEventId)}`,
      );
      setAudit(result);
    } catch (error: any) {
      toast.error(error.message);
      setAudit(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>
        <div className="border-b px-4 py-4 sm:px-5" style={{ borderColor: "var(--border)" }}>
          <p className="text-[11px] font-condensed font-800 uppercase tracking-[0.2em]" style={{ color: "var(--red)" }}>
            Evidência operacional
          </p>
          <h2 className="mt-1 font-condensed text-xl font-900 uppercase tracking-wide" style={{ color: "var(--text)" }}>
            Auditoria de picks
          </h2>
          <p className="mt-1 max-w-3xl text-sm" style={{ color: "var(--text-secondary)" }}>
            Consulte tentativas de autosave, gravações confirmadas pelo banco e cada alteração de palpite.
          </p>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label>
            <span className={lbl} style={{ color: "var(--text-muted)" }}>Usuário</span>
            <select value={userId} onChange={(event) => setUserId(event.target.value)} style={sel}>
              <option value="">Selecione</option>
              {sortedUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nickname || "Sem nickname"} · {user.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={lbl} style={{ color: "var(--text-muted)" }}>Evento</span>
            <select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)} style={sel}>
              <option value="">Selecione</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} · {new Date(event.event_date).getFullYear()}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={loadAudit}
            disabled={loading || !userId || !selectedEventId}
            className="min-h-11 px-5 font-condensed text-xs font-800 uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "var(--red)", color: "white" }}
          >
            {loading ? "Consultando…" : "Consultar trilha"}
          </button>
        </div>
      </section>

      {!audit && !loading && (
        <div className="border border-dashed p-8 text-center" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          Selecione o recorte acima para reconstruir a atividade dos picks.
        </div>
      )}

      {loading && (
        <div role="status" className="p-8 text-center text-sm" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          Cruzando tentativas, versões e estado atual…
        </div>
      )}

      {audit && !loading && (
        <>
          <section aria-labelledby="pick-audit-summary">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="pick-audit-summary" className="font-condensed text-lg font-900 uppercase" style={{ color: "var(--text)" }}>
                  {audit.subject.user.nickname} · {audit.subject.event.name}
                </h2>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Fechamento: {formatAdminDateTime(audit.subject.event.picks_lock_at)}
                </p>
              </div>
              <span className="text-[11px] font-condensed font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                IDs {shortId(audit.subject.user.id)} / {shortId(audit.subject.event.id)}
              </span>
            </div>
            <div className="grid overflow-hidden sm:grid-cols-2 lg:grid-cols-5" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>
              <Stat label="Cobertura atual" value={`${audit.summary.currentPickCount}/${audit.summary.totalFights}`} detail={`${audit.summary.coveragePercent}% do card`} />
              <Stat label="Saves aceitos" value={audit.summary.savedAttempts} detail={audit.summary.lastSaveAt ? `Último: ${formatAdminDateTime(audit.summary.lastSaveAt)}` : "Nenhum"} />
              <Stat label="Tentativas rejeitadas" value={audit.summary.rejectedAttempts} />
              <Stat label="Mudanças de decisão" value={audit.summary.decisionChanges} />
              <Stat label="Último save" value={audit.summary.lastSaveAt ? "Registrado" : "—"} detail={audit.summary.lastSaveAt ? `${formatAdminDateTime(audit.summary.lastSaveAt)} · ${formatOffset(audit.summary.lastSaveOffsetSeconds, audit.summary.lastSaveTiming)}` : "Nenhum save aceito"} />
            </div>
            <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              O histórico detalhado vale a partir da instalação desta auditoria{audit.auditStartedAt ? ` (${formatAdminDateTime(audit.auditStartedAt)})` : ""}. Picks anteriores aparecem somente como snapshot inicial.
            </p>
          </section>

          <section aria-labelledby="current-picks-heading">
            <h2 id="current-picks-heading" className="mb-3 font-condensed text-sm font-900 uppercase tracking-widest" style={{ color: "var(--text)" }}>
              Estado atual · {audit.currentPicks.length} picks
            </h2>
            <div className="overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                  <tr className="text-[11px] font-condensed uppercase tracking-widest">
                    <th className="px-4 py-3">Luta</th>
                    <th className="px-4 py-3">Pick gravado</th>
                    <th className="px-4 py-3">Escolhido no aparelho</th>
                    <th className="px-4 py-3">Confirmado em</th>
                    <th className="px-4 py-3">Request</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.currentPicks.map((pick) => (
                    <tr key={pick.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--text)" }}>{fightLabel(pick.fight)}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{pickLabel(pick, pick.fight)}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{formatAdminDateTime(pick.client_selected_at)}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{formatAdminDateTime(pick.confirmed_at)}</td>
                      <td className="px-4 py-3 font-mono text-xs" title={pick.last_save_request_id || undefined} style={{ color: "var(--text-muted)" }}>{shortId(pick.last_save_request_id)}</td>
                    </tr>
                  ))}
                  {audit.currentPicks.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center" style={{ color: "var(--text-muted)" }}>Nenhum pick atualmente gravado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="attempts-heading">
            <h2 id="attempts-heading" className="mb-3 font-condensed text-sm font-900 uppercase tracking-widest" style={{ color: "var(--text)" }}>
              Requisições de salvamento · {audit.attempts.length}
            </h2>
            <div className="space-y-2">
              {audit.attempts.map((attempt) => {
                const dbEvidence = requestIdsWithVersions.has(attempt.request_id);
                const color = attempt.status === "saved" ? "var(--green)" : attempt.status === "rejected" ? "var(--red)" : "var(--yellow)";
                return (
                  <article key={attempt.id} className="grid gap-3 p-4 md:grid-cols-[150px_1fr_auto] md:items-center" style={{ border: "1px solid var(--border)", borderLeft: `3px solid ${color}`, backgroundColor: "var(--bg-card)" }}>
                    <div>
                      <span className="text-[11px] font-condensed font-800 uppercase tracking-widest" style={{ color }}>
                        {attempt.status === "saved" ? "Aceita" : attempt.status === "rejected" ? "Rejeitada" : dbEvidence ? "Banco confirmou" : "Recebida"}
                      </span>
                      <p className="mt-1 font-mono text-xs" title={attempt.request_id} style={{ color: "var(--text-muted)" }}>req {shortId(attempt.request_id)}</p>
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: "var(--text)" }}>
                        {attempt.pick_count} {attempt.pick_count === 1 ? "pick enviado" : "picks enviados"} via {attempt.source}
                      </p>
                      {attempt.error_message ? (
                        <p className="mt-1 text-xs" style={{ color: "var(--red)" }}>{attempt.error_code}: {attempt.error_message}</p>
                      ) : (
                        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                          Cliente {shortId(attempt.client_request_id)}{dbEvidence ? " · há versão imutável no banco" : ""}
                        </p>
                      )}
                    </div>
                    <time dateTime={attempt.received_at} className="text-xs md:text-right" style={{ color: "var(--text-secondary)" }}>
                      {formatAdminDateTime(attempt.received_at)}
                    </time>
                  </article>
                );
              })}
              {audit.attempts.length === 0 && <p className="p-5 text-sm" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>Nenhuma tentativa registrada neste recorte.</p>}
            </div>
          </section>

          <section aria-labelledby="versions-heading">
            <h2 id="versions-heading" className="mb-3 font-condensed text-sm font-900 uppercase tracking-widest" style={{ color: "var(--text)" }}>
              Histórico imutável · {audit.versions.length} versões
            </h2>
            <ol className="space-y-2">
              {audit.versions.map((version) => {
                const changedDecision = version.changed_fields.some((field) => ["picked_winner_id", "picked_method", "picked_round"].includes(field));
                const label = version.operation === "snapshot" ? "Snapshot inicial" : version.operation === "insert" ? "Pick criado" : version.operation === "delete" ? "Pick excluído" : changedDecision ? "Pick alterado" : "Pick confirmado novamente";
                return (
                  <li key={version.id} className="relative p-4 sm:pl-5" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-condensed font-800 uppercase tracking-widest" style={{ color: changedDecision ? "var(--yellow)" : "var(--text-muted)" }}>{label}</span>
                          <span className="font-mono text-[11px]" title={version.request_id || undefined} style={{ color: "var(--text-muted)" }}>req {shortId(version.request_id)}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold" style={{ color: "var(--text)" }}>{fightLabel(version.fight)}</p>
                        {version.operation === "update" && version.before_data ? (
                          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                            <span className="line-through opacity-70">{pickLabel(version.before_data, version.fight)}</span>
                            <span className="mx-2" aria-hidden="true">→</span>
                            <span>{pickLabel(version.after_data, version.fight)}</span>
                          </p>
                        ) : (
                          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{pickLabel(version.after_data || version.before_data, version.fight)}</p>
                        )}
                        <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>Campos: {version.changed_fields.join(", ") || "—"} · origem {version.source}</p>
                      </div>
                      <time dateTime={version.occurred_at} className="shrink-0 text-xs sm:text-right" style={{ color: "var(--text-secondary)" }}>{formatAdminDateTime(version.occurred_at)}</time>
                    </div>
                  </li>
                );
              })}
              {audit.versions.length === 0 && <li className="p-5 text-sm" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>Nenhuma versão registrada.</li>}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
