"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);
    const supabase = createAuthClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error) {
      if (error.message.includes("User not found")) {
        toast.error("Email não encontrado");
        setFieldErrors({ email: "Email não encontrado" });
      } else if (error.message.includes("Invalid login credentials")) {
        toast.error("Senha incorreta");
        setFieldErrors({ password: "Senha incorreta" });
      } else {
        toast.error("Erro ao fazer login. Tente novamente.");
      }
      setLoading(false);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  async function handleForgotPassword() {
    if (!form.email) {
      toast.error("Digite seu email primeiro.");
      return;
    }
    setLoading(true);
    const supabase = createAuthClient();
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Link de redefinição enviado para seu email");
    }
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    padding: "12px 16px",
    fontSize: "14px",
    transition: "border-color 0.15s",
  };

  return (
    <main
      className="min-h-[100dvh] flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-dark.svg"
              alt="UFC Fantasy"
              width={113}
              height={20}
              className="h-7 w-auto"
              priority
            />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="mb-8">
            <div className="red-line">
              <span
                className="section-title text-2xl"
                style={{ fontSize: "1.75rem" }}
              >
                ENTRAR
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Acesse sua conta para fazer seus picks
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                className="block text-xs font-700 uppercase tracking-widest mb-2 font-condensed"
                style={{ color: "var(--text-secondary)" }}
              >
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              {fieldErrors.email && (
                <p className="text-xs mt-1" style={{ color: "var(--red)" }} role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-xs font-700 uppercase tracking-widest mb-2 font-condensed"
                style={{ color: "var(--text-secondary)" }}
              >
                Senha
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              {fieldErrors.password && (
                <p className="text-xs mt-1" style={{ color: "var(--red)" }} role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-condensed font-700 uppercase tracking-widest hover:opacity-80 transition-opacity"
                style={{ color: "var(--red)" }}
              >
                Esqueci a senha?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 mt-2"
              style={{ backgroundColor: "var(--red)" }}
            >
              {loading ? "ENTRANDO..." : "ENTRAR"}
            </button>
          </form>

          {/* Register CTA */}
          <div
            className="mt-8 pt-8"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <p
              className="font-condensed font-700 uppercase tracking-widest text-sm mb-1"
              style={{ color: "var(--text)" }}
            >
              Ainda não faz parte?
            </p>
            <p
              className="text-xs mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Crie sua conta e comece a fazer seus picks agora mesmo.
            </p>
            <Link
              href="/register"
              className="block w-full py-3.5 font-condensed font-900 text-sm uppercase tracking-widest text-center transition-all hover:opacity-80"
              style={{ border: "2px solid var(--red)", color: "var(--red)" }}
            >
              REGISTRE-SE
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
