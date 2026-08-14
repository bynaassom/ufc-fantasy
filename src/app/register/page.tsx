"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { DEFAULT_COMPETITIVE_DIVISION } from "@/lib/ufc-weight";
import BrandLogo from "@/components/ui/BrandLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    nickname: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    if (form.password !== form.confirm_password) {
      toast.error("As senhas não coincidem.");
      setFieldErrors({ confirm_password: "As senhas não coincidem." });
      return;
    }
    if (form.password.length < 8) {
      toast.error("Senha deve ter pelo menos 8 caracteres.");
      setFieldErrors({ password: "Senha deve ter pelo menos 8 caracteres." });
      return;
    }
    if (form.nickname && !/^[a-zA-Z0-9_]+$/.test(form.nickname)) {
      toast.error("Nickname: apenas letras, números e _");
      setFieldErrors({ nickname: "Apenas letras, números e _." });
      return;
    }
    if (
      form.nickname &&
      (form.nickname.length < 3 || form.nickname.length > 20)
    ) {
      toast.error("Nickname deve ter entre 3 e 20 caracteres.");
      setFieldErrors({ nickname: "Deve ter entre 3 e 20 caracteres." });
      return;
    }

    setLoading(true);
    const supabase = createAuthClient();

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          nickname: form.nickname,
          first_name: form.first_name,
          last_name: form.last_name,
          division: DEFAULT_COMPETITIVE_DIVISION,
          division_confirmed: true,
        },
      },
    });

    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Email já cadastrado."
          : error.message,
      );
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push(`/home`);
      setLoading(false);
      return;
    }

    setNeedsEmailConfirmation(true);
    setLoading(false);
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

  const labelClass =
    "block text-xs font-700 uppercase tracking-widest mb-2 font-condensed";

  return (
    <main
      className="min-h-[100dvh] flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo className="h-7 w-auto" priority />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {needsEmailConfirmation ? (
          <div className="w-full max-w-sm text-center">
            <div className="mb-6 flex justify-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--red)" }}
              >
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2
              className="text-xl font-condensed font-900 uppercase tracking-widest mb-3"
              style={{ color: "var(--text)" }}
            >
              Verifique seu email
            </h2>
            <p
              className="text-sm mb-8 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Enviamos um link de confirmação para {form.email}. Clique no link
              para ativar sua conta.
            </p>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                const supabase = createAuthClient();
                const { error } =
                  await supabase.auth.resend({
                    type: "signup",
                    email: form.email,
                  });
                setLoading(false);
                if (error) {
                  toast.error(error.message);
                } else {
                  toast.success("Email reenviado com sucesso");
                }
              }}
              disabled={loading}
              className="w-full py-3.5 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 mb-4"
              style={{ backgroundColor: "var(--red)" }}
            >
              {loading ? "REENVIANDO..." : "REENVIAR EMAIL"}
            </button>
            <Link
              href="/login"
              className="block text-xs font-condensed font-700 uppercase tracking-widest underline transition-opacity hover:opacity-80"
              style={{ color: "var(--red)" }}
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="red-line">
              <span className="section-title" style={{ fontSize: "1.75rem" }}>
                CRIAR CONTA
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Junte-se ao UFC Fantasy
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label
                className={labelClass}
                style={{ color: "var(--text-secondary)" }}
              >
                Nickname{" "}
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontWeight: 400,
                    textTransform: "none",
                    letterSpacing: 0,
                    fontSize: "11px",
                  }}
                >
                  (opcional)
                </span>
              </label>
              <input
                minLength={3}
                maxLength={20}
                autoComplete="nickname"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="SeuNick123"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                3–20 caracteres, letras, números e _ · Se vazio, usaremos seu
                nome
              </p>
              {fieldErrors.nickname && (
                <p className="text-xs mt-1" style={{ color: "var(--red)" }} role="alert">
                  {fieldErrors.nickname}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className={labelClass}
                  style={{ color: "var(--text-secondary)" }}
                >
                  Nome
                </label>
                <input
                  required
                  autoComplete="given-name"
                  value={form.first_name}
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                  placeholder="João"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div>
                <label
                  className={labelClass}
                  style={{ color: "var(--text-secondary)" }}
                >
                  Sobrenome
                </label>
                <input
                  required
                  autoComplete="family-name"
                  value={form.last_name}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                  placeholder="Silva"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
            </div>

            <div>
              <label
                className={labelClass}
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
                className={labelClass}
                style={{ color: "var(--text-secondary)" }}
              >
                Senha
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
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

            <div>
              <label
                className={labelClass}
                style={{ color: "var(--text-secondary)" }}
              >
                Confirmar senha
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={(e) =>
                  setForm({ ...form, confirm_password: e.target.value })
                }
                placeholder="Repita a senha"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              {fieldErrors.confirm_password && (
                <p className="text-xs mt-1" style={{ color: "var(--red)" }} role="alert">
                  {fieldErrors.confirm_password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 mt-2"
              style={{ backgroundColor: "var(--red)" }}
            >
              {loading ? "CRIANDO CONTA..." : "CRIAR CONTA"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Já tem conta?{" "}
              <Link
                href="/login"
                className="font-700 uppercase text-xs tracking-widest font-condensed underline"
                style={{ color: "var(--red)" }}
              >
                Entrar
              </Link>
            </p>
          </div>
        </div>
        )}
      </div>
    </main>
  );
}
