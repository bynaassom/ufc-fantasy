"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    if (!email) {
      toast.error("Email não encontrado. Tente se registrar novamente.");
      return;
    }
    setResending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) {
      toast.error("Erro ao reenviar. Tente novamente em alguns minutos.");
    } else {
      setResent(true);
      toast.success("Email reenviado!");
    }
    setResending(false);
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-1">
          <span
            className="text-xl font-black tracking-tighter"
            style={{ color: "var(--red)" }}
          >
            UFC
          </span>
          <span
            className="text-xl font-black tracking-tighter"
            style={{ color: "var(--text)" }}
          >
            FANTASY
          </span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "2px solid var(--red)",
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: "var(--red)" }}
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <h1
            className="text-3xl font-black tracking-tight mb-3"
            style={{ color: "var(--text)" }}
          >
            Verifique seu email
          </h1>

          <p
            className="text-base mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Enviamos um link de confirmação para:
          </p>

          {email && (
            <p
              className="text-base font-bold mb-6 px-4 py-2 rounded-lg inline-block"
              style={{
                backgroundColor: "var(--bg-card)",
                color: "var(--red)",
                border: "1px solid var(--border)",
              }}
            >
              {email}
            </p>
          )}

          <div
            className="p-5 rounded-xl mb-6 text-left space-y-3"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
              O que fazer agora:
            </p>
            {[
              "Abra seu email",
              "Clique no link de confirmação que enviamos",
              "Você será redirecionado automaticamente para o app",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "var(--red)" }}
                >
                  {i + 1}
                </span>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>

          {/* Resend */}
          {!resent ? (
            <div className="mb-6">
              <p
                className="text-sm mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                Não recebeu o email?
              </p>
              <button
                onClick={handleResend}
                disabled={resending || !email}
                className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ border: "2px solid var(--red)", color: "var(--red)" }}
              >
                {resending ? "Reenviando..." : "Reenviar email"}
              </button>
            </div>
          ) : (
            <div
              className="mb-6 p-3 rounded-lg"
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid var(--red)",
              }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--red)" }}
              >
                ✅ Email reenviado! Verifique sua caixa de entrada.
              </p>
            </div>
          )}

          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Email errado?{" "}
            <Link
              href="/register"
              className="font-bold underline"
              style={{ color: "var(--red)" }}
            >
              Registre-se novamente
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
