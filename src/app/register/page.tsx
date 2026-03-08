"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    if (form.password !== form.confirm_password) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(form.nickname)) {
      toast.error("Nickname: apenas letras, números e _");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          nickname: form.nickname,
          first_name: form.first_name,
          last_name: form.last_name,
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

    router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
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
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo-dark.svg"
              alt="UFC Fantasy"
              style={{ height: "28px", width: "auto" }}
            />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
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
                Nickname
              </label>
              <input
                required
                minLength={3}
                maxLength={20}
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
                3–20 caracteres, letras, números e _
              </p>
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
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
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
                Senha
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
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
                Confirmar senha
              </label>
              <input
                type="password"
                required
                value={form.confirm_password}
                onChange={(e) =>
                  setForm({ ...form, confirm_password: e.target.value })
                }
                placeholder="Repita a senha"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
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
      </div>
    </main>
  );
}
