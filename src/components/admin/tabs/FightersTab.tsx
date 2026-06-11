"use client";

import { useEffect, useMemo, useState, useDeferredValue } from "react";
import toast from "react-hot-toast";

import {
  adminGet,
  adminSend,
  inp,
  sel,
  lbl,
  focus,
  blur,
  AdminEmptyState,
} from "../shared";
import type { SubTab } from "../types";

// ─── Props ───────────────────────────────────────────────────
export default function FightersTab({ subTab }: { subTab: SubTab }) {
  switch (subTab) {
    case "ops-fighters":
      return <OperacoesFighters />;
    case "ops-fotos":
      return <OperacoesFotos />;
    default:
      return null;
  }
}

// ─── OPERAÇÕES: Mesclar Lutadores ────────────────────────────
function OperacoesFighters() {
  const [loading, setLoading] = useState(true);
  const [fighters, setFighters] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [primaryId, setPrimaryId] = useState("");
  const [duplicateId, setDuplicateId] = useState("");
  const [primaryQuery, setPrimaryQuery] = useState("");
  const [duplicateQuery, setDuplicateQuery] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const deferredPrimaryQuery = useDeferredValue(primaryQuery);
  const deferredDuplicateQuery = useDeferredValue(duplicateQuery);

  useEffect(() => {
    loadFighters();
  }, []);

  async function loadFighters() {
    setLoading(true);
    setError("");
    try {
      const data = await adminGet<{ fighters: any[] }>("/api/admin/fighters");
      setFighters(data.fighters || []);
    } catch (err) {
      setError(String(err));
      setFighters([]);
    } finally {
      setLoading(false);
    }
  }

  function normalizeFighterName(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function getSuggestionPrimary(a: any, b: any) {
    if (!!a.ufc_fighter_id !== !!b.ufc_fighter_id) {
      return a.ufc_fighter_id ? { primary: a, duplicate: b } : { primary: b, duplicate: a };
    }
    if ((a.name?.length || 0) !== (b.name?.length || 0)) {
      return (a.name?.length || 0) >= (b.name?.length || 0)
        ? { primary: a, duplicate: b }
        : { primary: b, duplicate: a };
    }
    return { primary: a, duplicate: b };
  }

  const duplicateSuggestions = useMemo(() => {
    const suggestions: {
      key: string;
      primary: any;
      duplicate: any;
      reason: string;
    }[] = [];
    const seen = new Set<string>();

    for (let index = 0; index < fighters.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < fighters.length; compareIndex += 1) {
        const left = fighters[index];
        const right = fighters[compareIndex];
        const leftNormalized = normalizeFighterName(left.name);
        const rightNormalized = normalizeFighterName(right.name);
        if (!leftNormalized || !rightNormalized) continue;

        const leftParts = leftNormalized.split(" ").filter(Boolean);
        const rightParts = rightNormalized.split(" ").filter(Boolean);
        const sameLastName =
          leftParts[leftParts.length - 1] &&
          leftParts[leftParts.length - 1] === rightParts[rightParts.length - 1];
        const sameFirstInitial = leftParts[0]?.[0] && leftParts[0]?.[0] === rightParts[0]?.[0];

        let reason: string | null = null;
        if (leftNormalized === rightNormalized) {
          reason = "Nome idêntico";
        } else if (
          sameLastName &&
          sameFirstInitial &&
          (leftNormalized.includes(rightNormalized) || rightNormalized.includes(leftNormalized))
        ) {
          reason = "Mesmo sobrenome e variação de nome";
        } else if (
          sameLastName &&
          sameFirstInitial &&
          left.country &&
          right.country &&
          left.country === right.country
        ) {
          reason = "Mesmo sobrenome, inicial e país";
        }

        if (!reason) continue;

        const orderedIds = [left.id, right.id].sort().join(":");
        if (seen.has(orderedIds)) continue;
        seen.add(orderedIds);

        const { primary, duplicate } = getSuggestionPrimary(left, right);
        suggestions.push({
          key: orderedIds,
          primary,
          duplicate,
          reason,
        });
      }
    }

    return suggestions.slice(0, 12);
  }, [fighters]);

  const primaryOptions = useMemo(
    () =>
      fighters
        .filter((fighter) =>
          normalizeFighterName(fighter.name).includes(
            normalizeFighterName(deferredPrimaryQuery),
          ),
        )
        .slice(0, 80),
    [fighters, deferredPrimaryQuery],
  );

  const duplicateOptions = useMemo(
    () =>
      fighters
        .filter((fighter) =>
          normalizeFighterName(fighter.name).includes(
            normalizeFighterName(deferredDuplicateQuery),
          ),
        )
        .slice(0, 80),
    [fighters, deferredDuplicateQuery],
  );

  async function runMerge(dryRun: boolean) {
    if (!primaryId || !duplicateId || primaryId === duplicateId) {
      toast.error("Selecione um principal e um duplicado diferentes.");
      return;
    }

    if (
      !dryRun &&
      !confirm(
        "Confirma mesclar este lutador duplicado? Essa ação move referências de lutas e picks e remove o ID duplicado.",
      )
    ) {
      return;
    }

    setSubmitting(true);
    if (dryRun) setPreview(null);

    try {
      const res = await fetch("/api/admin/merge-fighters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_id: primaryId,
          duplicate_id: duplicateId,
          dry_run: dryRun,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreview(data.summary || null);
        toast.error(data.error || "Erro ao mesclar lutadores");
        return;
      }

      if (dryRun) {
        setPreview(data.summary);
        toast.success(data.message);
      } else {
        toast.success(data.message);
        setPreview(data.summary);
        setDuplicateId("");
        setDuplicateQuery("");
        await loadFighters();
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="p-4 space-y-3"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            Mesclar Lutadores Duplicados
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Move referências de lutas e picks para um ID principal e remove o
            duplicado com segurança.
          </p>
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--red)" }}>
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              Manter este lutador
            </label>
            <input
              value={primaryQuery}
              onChange={(e) => setPrimaryQuery(e.target.value)}
              placeholder="Buscar lutador principal"
              style={inp}
              onFocus={focus}
              onBlur={blur}
            />
            <select
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
              style={sel}
              onFocus={focus}
              onBlur={blur}
            >
              <option value="">Selecione…</option>
              {primaryOptions.map((fighter) => (
                <option key={fighter.id} value={fighter.id}>
                  {fighter.name}
                  {fighter.country ? ` · ${fighter.country}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              Remover este duplicado
            </label>
            <input
              value={duplicateQuery}
              onChange={(e) => setDuplicateQuery(e.target.value)}
              placeholder="Buscar lutador duplicado"
              style={inp}
              onFocus={focus}
              onBlur={blur}
            />
            <select
              value={duplicateId}
              onChange={(e) => setDuplicateId(e.target.value)}
              style={sel}
              onFocus={focus}
              onBlur={blur}
            >
              <option value="">Selecione…</option>
              {duplicateOptions.map((fighter) => (
                <option key={fighter.id} value={fighter.id}>
                  {fighter.name}
                  {fighter.country ? ` · ${fighter.country}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => runMerge(true)}
            disabled={submitting || loading}
            className="flex-1 py-3 font-condensed font-900 text-sm uppercase tracking-widest disabled:opacity-40"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            {submitting ? "PROCESSANDO..." : "VER IMPACTO"}
          </button>
          <button
            onClick={() => runMerge(false)}
            disabled={submitting || loading}
            className="flex-1 py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--red)" }}
          >
            {submitting ? "MESCLANDO..." : "MESCLAR LUTADORES"}
          </button>
        </div>
      </div>

      {duplicateSuggestions.length > 0 && (
        <div
          className="p-4 space-y-3"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            Sugestões de Duplicados
          </p>
          <div className="space-y-2">
            {duplicateSuggestions.map((suggestion) => (
              <div
                key={suggestion.key}
                className="p-3"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {suggestion.reason}
                </p>
                <div className="flex items-center justify-between gap-3 mt-2">
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    <strong>Manter:</strong> {suggestion.primary.name}
                    <br />
                    <strong>Mesclar:</strong> {suggestion.duplicate.name}
                  </div>
                  <button
                    onClick={() => {
                      setPrimaryId(suggestion.primary.id);
                      setDuplicateId(suggestion.duplicate.id);
                      setPrimaryQuery(suggestion.primary.name);
                      setDuplicateQuery(suggestion.duplicate.name);
                    }}
                    className="px-3 py-2 text-xs font-condensed font-900 uppercase tracking-widest text-white"
                    style={{ backgroundColor: "var(--red)" }}
                  >
                    USAR ESTA SUGESTÃO
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {duplicateSuggestions.length === 0 && !loading && !error && (
        <div
          className="p-4"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <AdminEmptyState text="Nenhuma sugestão forte de duplicidade encontrada agora. Você ainda pode buscar e mesclar manualmente." />
        </div>
      )}

      {preview && (
        <div
          className="p-4 space-y-2"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            Impacto do Merge
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {preview.primary?.name} ← {preview.duplicate?.name}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Lutas como A: {preview.impacts?.fights_as_a || 0} · Lutas como B:{" "}
            {preview.impacts?.fights_as_b || 0} · Winner refs:{" "}
            {preview.impacts?.winner_refs || 0} · Picks:{" "}
            {preview.impacts?.picked_winner_refs || 0}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Revise esse impacto antes de confirmar o merge definitivo.
          </p>
          {preview.conflicts?.length > 0 && (
            <div>
              <p className="text-xs" style={{ color: "var(--red)" }}>
                Conflitos detectados:
              </p>
              {preview.conflicts.map((conflict: any) => (
                <p
                  key={conflict.id}
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  • {conflict.label}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── OPERAÇÕES: Fotos ────────────────────────────────────────
function OperacoesFotos() {
  const [limit, setLimit] = useState(25);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    processed_count: number;
    updated: string[];
    not_found: string[];
    errors: string[];
    dry_run?: boolean;
  } | null>(null);

  async function runMediaSync(dryRun: boolean) {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/enrich-fighter-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dry_run: dryRun,
          only_missing: onlyMissing,
          limit,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao sincronizar fotos dos lutadores");
        return;
      }

      setResult(data);
      toast.success(data.message);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="p-4 space-y-4"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            Preencher Fotos dos Lutadores
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Busca automaticamente as fotos oficiais no UFC para reduzir o
            trabalho manual de cadastro e manutenção.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[160px_auto]">
          <div>
            <label className={lbl} style={{ color: "var(--text-secondary)" }}>
              Limite por rodada
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value || "25", 10))}
              style={inp}
              onFocus={focus}
              onBlur={blur}
            />
          </div>
          <label
            className="flex items-center gap-2 pt-7"
            style={{ color: "var(--text-secondary)" }}
          >
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
            />
            <span className="text-xs uppercase tracking-widest">
              Só fighters sem foto
            </span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => runMediaSync(true)}
            disabled={loading}
            className="py-3 font-condensed font-900 text-sm uppercase tracking-widest disabled:opacity-40"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            {loading ? "PROCESSANDO..." : "VER PRÉVIA"}
          </button>
          <button
            onClick={() => runMediaSync(false)}
            disabled={loading}
            className="py-3 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--red)" }}
          >
            {loading ? "ATUALIZANDO..." : "PREENCHER FOTOS"}
          </button>
        </div>
      </div>

      {result && (
        <div
          className="p-4 space-y-2"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="font-condensed font-700 text-sm uppercase"
            style={{ color: "var(--text)" }}
          >
            {result.message}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Processados: {result.processed_count}
          </p>
          {result.updated.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Encontrados: {result.updated.join(" · ")}
            </p>
          )}
          {result.not_found.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sem foto: {result.not_found.join(" · ")}
            </p>
          )}
          {result.errors.length > 0 && (
            <p className="text-xs" style={{ color: "var(--red)" }}>
              Erros: {result.errors.join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
