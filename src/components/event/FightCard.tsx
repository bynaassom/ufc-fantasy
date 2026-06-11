"use client";

import Image from "next/image";
import { useState } from "react";
import { FightWithFighters, FightMethod, Pick } from "@/types";
import { getFallbackHeadshot, getMethodLabel } from "@/lib/utils";
import FightStatsCompare from "./FightStatsCompare";
import { WEIGHT_CLASS_PT } from "@/lib/ufc-api";

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface FightCardProps {
  fight: FightWithFighters;
  existingPick?: Pick;
  locked: boolean;
  unavailablePicksLabel?: string;
  onPickChange?: (
    fightId: string,
    winnerId: string,
    method: FightMethod,
    round: number,
  ) => void;
}

const METHODS: { value: FightMethod; label: string }[] = [
  { value: "decision", label: "DECISÃO" },
  { value: "submission", label: "FINALIZAÇÃO" },
  { value: "knockout", label: "NOCAUTE" },
];

export default function FightCard({
  fight,
  existingPick,
  locked,
  unavailablePicksLabel = "PICKS ENCERRADOS",
  onPickChange,
}: FightCardProps) {
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(
    existingPick?.picked_winner_id || null,
  );
  const [selectedMethod, setSelectedMethod] = useState<FightMethod | null>(
    existingPick?.picked_method || null,
  );
  const [selectedRound, setSelectedRound] = useState<number | null>(
    existingPick?.picked_round || null,
  );
  const [hoveredFighterId, setHoveredFighterId] = useState<string | null>(null);

  const weightLabel = WEIGHT_CLASS_PT[fight.weight_class] || fight.weight_class;
  const rounds = Array.from({ length: fight.total_rounds }, (_, i) => i + 1);

  // ── Estado do resultado ────────────────────────────────────
  const completed = fight.result_confirmed && !!fight.winner_id;

  // O que o usuário apostou
  const pickedWinnerId = existingPick?.picked_winner_id || null;
  const pickedMethod = existingPick?.picked_method || null;
  const pickedRound = existingPick?.picked_round || null;

  // Acertos (só relevante se luta completada e usuário tinha pick)
  const hitWinner = completed && pickedWinnerId === fight.winner_id;
  const hitMethod = hitWinner && pickedMethod === fight.result_method;
  // Decisão: round é automático se acertou vencedor + método (vale 3 pts)
  const hitRound =
    hitWinner &&
    hitMethod &&
    (fight.result_method === "decision"
      ? true
      : pickedRound === fight.result_round);

  // ── Handlers ──────────────────────────────────────────────
  function selectFighter(id: string) {
    if (locked) return;
    if (selectedWinnerId === id) {
      setSelectedWinnerId(null);
      setSelectedMethod(null);
      setSelectedRound(null);
    } else {
      setSelectedWinnerId(id);
      setSelectedMethod(null);
      setSelectedRound(null);
    }
  }

  function selectMethod(m: FightMethod) {
    if (locked || !selectedWinnerId) return;
    if (selectedMethod === m) {
      setSelectedMethod(null);
      setSelectedRound(null);
    } else {
      setSelectedMethod(m);
      if (m === "decision") {
        setSelectedRound(fight.total_rounds);
        onPickChange?.(fight.id, selectedWinnerId!, m, fight.total_rounds);
      } else {
        setSelectedRound(null);
      }
    }
  }

  function selectRound(r: number) {
    if (locked || !selectedMethod) return;
    setSelectedRound(r);
    onPickChange?.(fight.id, selectedWinnerId!, selectedMethod!, r);
  }

  const complete = selectedWinnerId && selectedMethod && selectedRound;

  // ── Estilo do card raiz ────────────────────────────────────
  // Luta completada + errou → card inteiro dessaturado
  const cardFilter =
    completed && !hitWinner && pickedWinnerId
      ? "grayscale(1) brightness(0.55)"
      : "none";

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: completed
          ? hitWinner
            ? "1px solid #22c55e"
            : "1px solid var(--border)"
          : `1px solid ${complete ? "var(--red)" : "var(--border)"}`,
        filter: cardFilter,
        transition: "border-color 0.2s, filter 0.3s",
      }}
    >
      {/* Weight class header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-elevated)",
        }}
      >
        <span
          className="font-condensed font-700 text-xs uppercase tracking-widest"
          style={{ color: "var(--text-secondary)" }}
        >
          {fight.is_title_fight && (
            <span
              className="mr-2 px-1.5 py-0.5 text-white font-900"
              style={{ backgroundColor: "var(--red)", fontSize: "10px" }}
            >
              TÍTULO
            </span>
          )}
          {weightLabel}
        </span>
        {fight.total_rounds === 5 && (
          <span
            className="font-condensed font-700 text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            5 ROUNDS
          </span>
        )}
      </div>

      {/* Fighters */}
      <div className="grid grid-cols-2 relative">
        {[fight.fighter_a, fight.fighter_b].map((fighter, idx) => {
          const isMyPick = pickedWinnerId === fighter.id;
          const isWinner = completed && fight.winner_id === fighter.id;
          const isLoser =
            completed && !!fight.winner_id && fight.winner_id !== fighter.id;

          // Antes do resultado: seleção interativa normal
          const isSelected = !completed && selectedWinnerId === fighter.id;
          const isDefeated =
            !completed && !!selectedWinnerId && selectedWinnerId !== fighter.id;
          const isHovered = hoveredFighterId === fighter.id && !locked && !completed;

          // Corner: vermelho (esquerda) / azul (direita)
          const cornerColor = idx === 0 ? "var(--red)" : "var(--blue)";
          const cornerActive = !completed && (isSelected || isHovered);
          const traceOpacity = isSelected ? 1 : isHovered ? 0.7 : 0;
          const gradientOpacity = isSelected ? 0.9 : isHovered ? 0.35 : 0;
          const easedTransition = "0.4s cubic-bezier(0.4, 0, 0.2, 1)";

          // Cor do nome
          let nameColor = "var(--text)";
          if (completed) {
            if (isWinner && isMyPick)
              nameColor = "#22c55e"; // acertou — verde
            else if (isWinner && !isMyPick) nameColor = "var(--text)"; // vencedor mas não apostei
          } else if (isSelected) {
            nameColor = cornerColor;
          }

          // Borda da foto — sem vermelho, apenas resultados
          let photoBorder = `2px solid var(--border)`;
          if (completed && isWinner && isMyPick)
            photoBorder = "2px solid #22c55e";

          const photoGlow = completed && isWinner && isMyPick
            ? "0 0 16px rgba(34,197,94,0.35)"
            : "none";

          return (
            <button
              key={fighter.id}
              onClick={() => selectFighter(fighter.id)}
              disabled={locked}
              onMouseEnter={() => setHoveredFighterId(fighter.id)}
              onMouseLeave={() => setHoveredFighterId(null)}
              className="fighter-select-btn flex flex-col items-center py-6 px-4 relative overflow-hidden"
              style={{
                backgroundColor: completed && isWinner && isMyPick
                  ? "rgba(34,197,94,0.04)"
                  : "transparent",
                filter:
                  isDefeated || (completed && isLoser)
                    ? "grayscale(1) brightness(0.4)"
                    : "none",
                borderRight: idx === 0 ? "1px solid var(--border)" : "none",
                cursor: locked ? "default" : "pointer",
                transition: "filter 0.3s",
              }}
            >
              {/* Gradient de fundo — área total */}
              <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                  background: `linear-gradient(${idx === 0 ? "135deg" : "225deg"}, ${cornerColor} 0%, transparent 65%)`,
                  opacity: gradientOpacity,
                  transition: `opacity ${easedTransition}`,
                }}
              />
              {/* Traçado de seleção — 3 lados, abertura pro centro */}
              {/* Topo */}
              <div
                className="absolute top-0 left-0 right-0 pointer-events-none z-10"
                style={{
                  height: 2,
                  backgroundColor: cornerColor,
                  opacity: traceOpacity,
                  transition: `opacity ${easedTransition}`,
                }}
              />
              {/* Base */}
              <div
                className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
                style={{
                  height: 2,
                  backgroundColor: cornerColor,
                  opacity: traceOpacity,
                  transition: `opacity ${easedTransition}`,
                }}
              />
              {/* Lado externo (esquerda p/ fighter A, direita p/ fighter B) */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{
                  [idx === 0 ? "left" : "right"]: 0,
                  width: 2,
                  backgroundColor: cornerColor,
                  opacity: traceOpacity,
                  transition: `opacity ${easedTransition}`,
                }}
              />
              {/* Headshot */}
              <div
                className="relative mb-4 overflow-hidden"
                style={{
                  width: "clamp(80px, 18vw, 130px)",
                  height: "clamp(80px, 18vw, 130px)",
                  borderRadius: "50%",
                  border: photoBorder,
                  boxShadow: photoGlow,
                  transition: "all 0.2s",
                }}
              >
                <Image
                  src={
                    fighter.headshot_url || getFallbackHeadshot(fighter.name)
                  }
                  alt={fighter.name}
                  fill
                  className="object-cover object-top"
                />
              </div>

              {/* Name */}
              <p
                className="font-condensed font-600 uppercase text-center leading-tight"
                style={{
                  color: nameColor,
                  fontSize: "clamp(0.75rem, 2vw, 1rem)",
                  letterSpacing: "0.03em",
                }}
              >
                {fighter.name}
              </p>
              {fighter.country && (
                <p
                  className="font-condensed font-400 uppercase text-xs mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {fighter.country}
                </p>
              )}

              {/* Odds */}
              {(() => {
                const odds = idx === 0 ? fight.odds_a : fight.odds_b;
                if (!odds) return null;
                const isFav = odds.startsWith("-");
                return (
                  <span
                    className="font-condensed font-700 text-xs mt-1.5 px-2 py-0.5"
                    style={{
                      backgroundColor: isFav
                        ? "rgba(232,0,26,0.12)"
                        : "rgba(255,255,255,0.06)",
                      color: isFav ? "var(--red)" : "var(--text-secondary)",
                      border: `1px solid ${isFav ? "rgba(232,0,26,0.3)" : "var(--border)"}`,
                    }}
                  >
                    {odds}
                  </span>
                );
              })()}

              {/* Check do pick selecionado (antes do resultado) */}
              {isSelected && !completed && (
                <div
                  className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center"
                  style={{ backgroundColor: cornerColor }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              )}

              {/* Ícone de acerto no vencedor (resultado confirmado) */}
              {completed && isWinner && isMyPick && (
                <div
                  className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center"
                  style={{ backgroundColor: "#22c55e" }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}

        {/* VS ilha */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center gap-1.5"
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span
              className="font-condensed font-700"
              style={{
                color: "var(--text-muted)",
                fontSize: "10px",
                letterSpacing: "0.05em",
              }}
            >
              VS
            </span>
          </div>
          {fight.ufc_matchup_url && (
            <a
              href={fight.ufc_matchup_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-condensed font-700 uppercase flex items-center gap-0.5 transition-opacity hover:opacity-70 min-tap"
              style={{
                fontSize: "8px",
                letterSpacing: "0.06em",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              UFC.COM
              <svg
                width="7"
                height="7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Comparativo de stats — inline, expansível */}
      <FightStatsCompare
        slugA={nameToSlug(fight.fighter_a.name)}
        slugB={nameToSlug(fight.fighter_b.name)}
        nameA={fight.fighter_a.name}
        nameB={fight.fighter_b.name}
      />

      {/* Method + Round combinado (mobile-friendly) */}
      {!completed && selectedWinnerId && !locked && (
        <div
          className="px-4 py-3 slide-down"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p
            className="font-condensed font-700 text-xs uppercase tracking-widest mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Método e round
          </p>
          <div className="flex flex-wrap gap-1.5">
            {METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => selectMethod(m.value)}
                className="font-condensed font-900 text-xs uppercase tracking-widest transition-all hover:opacity-80"
                style={{
                  padding: selectedMethod === m.value ? "8px 14px" : "8px 14px",
                  backgroundColor:
                    selectedMethod === m.value
                      ? "var(--red)"
                      : "var(--bg-elevated)",
                  color:
                    selectedMethod === m.value
                      ? "white"
                      : "var(--text-secondary)",
                  border: `1px solid ${selectedMethod === m.value ? "var(--red)" : "var(--border)"}`,
                }}
              >
                {m.label}
              </button>
            ))}
            {selectedMethod && selectedMethod !== "decision" && (
              <span
                className="inline-flex items-center px-2"
                style={{ color: "var(--text-muted)" }}
              >
                —
              </span>
            )}
            {selectedMethod && selectedMethod !== "decision" && (
              rounds.map((r) => (
                <button
                  key={r}
                  onClick={() => selectRound(r)}
                  className="font-condensed font-900 text-sm uppercase transition-all hover:opacity-80"
                  style={{
                    padding: "8px 12px",
                    backgroundColor:
                      selectedRound === r
                        ? "var(--red)"
                        : "var(--bg-elevated)",
                    color:
                      selectedRound === r ? "white" : "var(--text-secondary)",
                    border: `1px solid ${selectedRound === r ? "var(--red)" : "var(--border)"}`,
                  }}
                >
                  R{r}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Pick summary — antes do resultado, pick completo */}
      {!completed && complete && (
        <div
          className="px-4 py-2.5 flex items-center gap-2 slide-down"
          style={{
            borderTop: "1px solid var(--border)",
            backgroundColor: selectedWinnerId === fight.fighter_a.id
              ? "rgba(232,0,26,0.08)"
              : "rgba(59,130,246,0.08)",
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedWinnerId === fight.fighter_a.id ? "var(--red)" : "var(--blue)" }}
          />
          <span
            className="font-condensed font-700 text-xs uppercase tracking-widest"
            style={{ color: selectedWinnerId === fight.fighter_a.id ? "var(--red)" : "var(--blue)" }}
          >
            {selectedWinnerId === fight.fighter_a.id
              ? fight.fighter_a.name
              : fight.fighter_b.name}
            {" · "}
            {getMethodLabel(selectedMethod!)}
            {selectedMethod !== "decision" && ` · R${selectedRound}`}
          </span>
        </div>
      )}

      {/* Pick exibido após lock mas antes do resultado */}
      {locked && !completed && existingPick && (
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: "var(--text-muted)" }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span
            className="font-condensed font-700 text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            {existingPick.picked_winner_id === fight.fighter_a.id
              ? fight.fighter_a.name
              : fight.fighter_b.name}
            {" · "}
            {getMethodLabel(existingPick.picked_method)}
            {existingPick.picked_method !== "decision"
              ? ` · R${existingPick.picked_round}`
              : ""}
          </span>
        </div>
      )}

      {/* Sem pick e picks indisponíveis */}
      {locked && !completed && !existingPick && (
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: "var(--text-muted)" }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span
            className="font-condensed font-700 text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            {unavailablePicksLabel}
          </span>
        </div>
      )}

      {/* Resultado + gabarito do pick */}
      {completed && fight.result_method && (
        <div
          style={{
            borderTop: `2px solid ${hitWinner ? "#22c55e" : "var(--border)"}`,
          }}
        >
          {/* Linha do resultado oficial */}
          <div
            className="px-4 py-2.5 flex items-center gap-2"
            style={{
              backgroundColor: hitWinner
                ? "rgba(34,197,94,0.06)"
                : "rgba(0,0,0,0.2)",
            }}
          >
            <span
              className="font-condensed font-900 text-xs uppercase tracking-widest"
              style={{ color: hitWinner ? "#22c55e" : "var(--text-muted)" }}
            >
              RESULTADO
            </span>
            <span
              className="font-condensed font-700 text-xs uppercase tracking-widest"
              style={{ color: "var(--text)" }}
            >
              {fight.winner?.name} · {getMethodLabel(fight.result_method)}
              {fight.result_method !== "decision"
                ? ` · R${fight.result_round}`
                : ""}
            </span>
          </div>

          {/* Gabarito do pick do usuário */}
          {existingPick && (
            <div
              className="px-4 py-2 flex items-center gap-3"
              style={{
                borderTop: "1px solid var(--border)",
                backgroundColor: "var(--bg-elevated)",
              }}
            >
              {/* Vencedor */}
              <span
                className="font-condensed font-700 text-xs uppercase tracking-widest"
                style={{ color: hitWinner ? "#22c55e" : "var(--text-muted)" }}
              >
                {existingPick.picked_winner_id === fight.fighter_a.id
                  ? fight.fighter_a.name
                  : fight.fighter_b.name}
              </span>

              <span style={{ color: "var(--border)" }}>·</span>

              {/* Método */}
              <span
                className="font-condensed font-700 text-xs uppercase tracking-widest"
                style={{ color: hitMethod ? "#22c55e" : "var(--text-muted)" }}
              >
                {getMethodLabel(existingPick.picked_method)}
              </span>

              {/* Round (só se não for decisão) */}
              {existingPick.picked_method !== "decision" && (
                <>
                  <span style={{ color: "var(--border)" }}>·</span>
                  <span
                    className="font-condensed font-700 text-xs uppercase tracking-widest"
                    style={{
                      color: hitRound ? "#22c55e" : "var(--text-muted)",
                    }}
                  >
                    R{existingPick.picked_round}
                  </span>
                </>
              )}

              {/* Pontos ganhos */}
              <span
                className="ml-auto font-condensed font-900 text-xs"
                style={{ color: hitWinner ? "#22c55e" : "var(--text-muted)" }}
              >
                +
                {(hitWinner ? 1 : 0) + (hitMethod ? 1 : 0) + (hitRound ? 1 : 0)}{" "}
                pts
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
