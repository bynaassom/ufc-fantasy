"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  COMPETITIVE_DIVISIONS,
  getWeightClassLabel,
  type CompetitiveDivision,
} from "@/lib/ufc-weight";
import { readApiResponse } from "@/lib/api";
import type { MeResponse } from "@/types/api";

export default function DivisionOnboardingModal({
  initialDivision,
  open,
  onConfirmed,
}: {
  initialDivision: CompetitiveDivision;
  open: boolean;
  onConfirmed: () => void;
}) {
  const router = useRouter();
  const [division, setDivision] = useState(initialDivision);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDivision(initialDivision);
  }, [initialDivision]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await readApiResponse<MeResponse>(
        await fetch("/api/me/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ division }),
        }),
      );

      toast.success("Categoria definida!");
      onConfirmed();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Não foi possível salvar sua categoria.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--bg-overlay-82)" }}
    >
      <form
        onSubmit={handleConfirm}
        className="w-full max-w-lg p-6 md:p-7"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderTop: "3px solid var(--red)",
          boxShadow: "0 24px 80px var(--bg-overlay-45)",
        }}
      >
        <p
          className="font-condensed font-700 text-xs uppercase tracking-widest"
          style={{ color: "var(--text-secondary)" }}
        >
          Ranking por categoria
        </p>
        <h2
          className="font-condensed font-900 text-3xl uppercase tracking-wide mt-2"
          style={{ color: "var(--text)" }}
        >
          Escolha seu peso
        </h2>
        <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
          Você continua fazendo picks do card inteiro normalmente. A categoria
          define apenas em qual ranking ranqueado você compete.
        </p>
        <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
          Depois, se quiser trocar, é só ir em <strong>Perfil → Categoria</strong>.
        </p>

        <div className="mt-6">
          <label
            className="block text-xs font-700 uppercase tracking-widest mb-2 font-condensed"
            style={{ color: "var(--text-secondary)" }}
          >
            Categoria competitiva
          </label>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value as CompetitiveDivision)}
            className="w-full px-4 py-3 text-sm"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            {COMPETITIVE_DIVISIONS.map((option) => (
              <option key={option} value={option}>
                {getWeightClassLabel(option)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 py-3.5 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-40"
          style={{ backgroundColor: "var(--red)" }}
        >
          {loading ? "SALVANDO..." : "CONFIRMAR CATEGORIA"}
        </button>
      </form>
    </div>
  );
}
