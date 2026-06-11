"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const STEPS = [
  {
    title: "Bem-vindo ao UFC Fantasy!",
    body: "Aqui você aposta nos resultados das lutas, desafia amigos e sobe no ranking. Vamos mostrar como funciona.",
  },
  {
    title: "Faça seus picks",
    body: "Em cada evento, escolha o vencedor, o método (nocaute, finalização ou decisão) e o round de cada luta. Quanto mais acertar, mais pontos ganha!",
    highlight: "Picks",
  },
  {
    title: "Desafie amigos",
    body: "No perfil de qualquer jogador, clique em \"Desafiar\" para criar um desafio. Vocês competem lado a lado no mesmo evento.",
    highlight: "Desafios",
  },
  {
    title: "Entre em ligas",
    body: "Crie ou entre em ligas com amigos usando um código. Acompanhem o ranking exclusivo da sua turma!",
    highlight: "Ligas",
  },
  {
    title: "Pronto!",
    body: "Agora é só acompanhar os eventos, fazer seus picks e subir no ranking. Boa sorte! 🏆",
  },
];

export default function OnboardingTour({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function handleNext() {
    if (isLast) {
      setCompleting(true);
      try {
        const res = await fetch("/api/me/onboarding", { method: "POST" });
        if (!res.ok) throw new Error();
        onComplete();
      } catch {
        toast.error("Erro ao finalizar. Tente novamente.");
      } finally {
        setCompleting(false);
      }
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleSkip() {
    fetch("/api/me/onboarding", { method: "POST" }).catch(() => {});
    onComplete();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="w-full max-w-sm p-6 rounded-lg animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Step indicator */}
        <div className="flex gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{
                backgroundColor:
                  i <= step ? "var(--red)" : "var(--border)",
              }}
            />
          ))}
        </div>

        {/* Content */}
        <p
          className="font-condensed font-900 text-xl uppercase tracking-wide"
          style={{ color: "var(--text)" }}
        >
          {current.title}
        </p>
        <p
          className="text-sm mt-3 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {current.body}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleSkip}
            className="text-xs font-condensed font-700 uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Pular
          </button>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 text-xs font-condensed font-700 uppercase tracking-widest"
                style={{
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                Voltar
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={completing}
              className="px-5 py-2 text-xs font-condensed font-700 uppercase tracking-widest text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--red)" }}
            >
              {completing
                ? "Finalizando..."
                : isLast
                  ? "Começar!"
                  : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
