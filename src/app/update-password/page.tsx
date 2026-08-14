"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createAuthClient } from "@/lib/supabase/client";
import BrandLogo from "@/components/ui/BrandLogo";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const supabase = createAuthClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(
        error.message.toLowerCase().includes("session")
          ? "O link expirou. Solicite uma nova redefinição."
          : "Não foi possível atualizar a senha.",
      );
      return;
    }

    toast.success("Senha atualizada com sucesso.");
    router.replace("/home");
    router.refresh();
  }

  const inputClass =
    "w-full px-4 py-3 text-sm outline-none border transition-colors focus:border-[var(--red)]";

  return (
    <main className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="inline-flex">
            <BrandLogo className="h-7 w-auto" priority />
          </Link>
        </div>
      </header>

      <div className="flex-1 grid place-items-center px-4 py-12">
        <section className="w-full max-w-sm border-t-4 p-6 sm:p-8" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--red)" }}>
          <p className="font-condensed font-700 text-xs uppercase tracking-[0.22em] mb-2" style={{ color: "var(--red)" }}>Segurança da conta</p>
          <h1 className="font-condensed font-900 text-3xl uppercase tracking-wide mb-2">Nova senha</h1>
          <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>Defina uma nova senha para voltar aos seus picks.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="block font-condensed font-700 text-xs uppercase tracking-widest mb-2">Senha</span>
              <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text)" }} />
            </label>
            <label className="block">
              <span className="block font-condensed font-700 text-xs uppercase tracking-widest mb-2">Confirmar senha</span>
              <input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text)" }} />
            </label>
            <button type="submit" disabled={loading} className="w-full py-3.5 font-condensed font-900 text-sm uppercase tracking-widest text-white disabled:opacity-50" style={{ backgroundColor: "var(--red)" }}>
              {loading ? "ATUALIZANDO..." : "ATUALIZAR SENHA"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
