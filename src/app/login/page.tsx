"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error) {
      toast.error("Email ou senha incorretos.");
      setLoading(false);
      return;
    }
    router.push("/home");
    router.refresh();
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
                className="block text-xs font-700 uppercase tracking-widest mb-2 font-condensed"
                style={{ color: "var(--text-secondary)" }}
              >
                Senha
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
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
