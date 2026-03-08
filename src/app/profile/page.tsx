"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types";
import toast from "react-hot-toast";
import Navbar from "@/components/layout/Navbar";

export default function ProfilePage({ searchParams }: { searchParams: { tab?: string } }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"nickname" | "password">(searchParams.tab === "password" ? "password" : "nickname");

  const [nickname, setNickname] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) { setProfile(data); setNickname(data.nickname); }
    }
    load();
  }, [router]);

  async function handleUpdateNickname(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname || nickname === profile?.nickname) return;
    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) { toast.error("Nickname: apenas letras, números e _"); return; }
    if (nickname.length < 3 || nickname.length > 20) { toast.error("Nickname deve ter entre 3 e 20 caracteres."); return; }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ nickname })
      .eq("id", profile!.id);

    if (error) {
      toast.error(error.message.includes("unique") ? "Este nickname já está em uso." : error.message);
    } else {
      toast.success("Nickname atualizado!");
      setProfile((p) => p ? { ...p, nickname } : p);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem."); return; }
    if (newPassword.length < 8) { toast.error("Senha deve ter pelo menos 8 caracteres."); return; }

    setLoading(true);
    const supabase = createClient();

    // Re-authenticate first
    const { data: { user } } = await supabase.auth.getUser();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: currentPassword,
    });

    if (signInErr) {
      toast.error("Senha atual incorreta.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha atualizada!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    }
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

  const labelClass = "block text-xs font-700 uppercase tracking-widest mb-2 font-condensed";

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--red)", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="min-h-screen pb-24 md:pb-0" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar />

      <main className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="red-line">
            <span className="section-title" style={{ fontSize: "1.75rem" }}>MEU PERFIL</span>
          </div>

          {/* Profile card */}
          <div className="flex items-center gap-4 mt-4 p-4"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid var(--red)" }}>
            <div className="w-12 h-12 flex items-center justify-center font-condensed font-900 text-xl text-white flex-shrink-0"
              style={{ backgroundColor: "var(--red)" }}>
              {profile.nickname[0].toUpperCase()}
            </div>
            <div>
              <p className="font-condensed font-900 text-lg uppercase tracking-wide" style={{ color: "var(--text)" }}>
                {profile.nickname}
              </p>
              <p className="font-condensed font-600 text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                {profile.first_name} {profile.last_name}
              </p>
              <p className="font-condensed font-700 text-xs uppercase tracking-widest mt-1" style={{ color: "var(--red)" }}>
                {profile.total_points} pontos
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          {(["nickname", "password"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="relative font-condensed font-700 text-xs uppercase tracking-widest px-6 py-2.5 transition-all"
              style={{ color: tab === t ? "var(--red)" : "var(--text-muted)" }}>
              {t === "nickname" ? "Nickname" : "Senha"}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "var(--red)" }} />}
            </button>
          ))}
        </div>

        {/* Nickname tab */}
        {tab === "nickname" && (
          <form onSubmit={handleUpdateNickname} className="space-y-5">
            <div>
              <label className={labelClass} style={{ color: "var(--text-secondary)" }}>Novo Nickname</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                minLength={3} maxLength={20} required
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                3–20 caracteres · letras, números e _ · atual: <span style={{ color: "var(--red)" }}>{profile.nickname}</span>
              </p>
            </div>

            <button type="submit" disabled={loading || nickname === profile.nickname}
              className="w-full py-3.5 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: "var(--red)" }}>
              {loading ? "SALVANDO..." : "SALVAR NICKNAME"}
            </button>
          </form>
        )}

        {/* Password tab */}
        {tab === "password" && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className={labelClass} style={{ color: "var(--text-secondary)" }}>Senha atual</label>
              <input
                type="password" required value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--text-secondary)" }}>Nova senha</label>
              <input
                type="password" required minLength={8} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--text-secondary)" }}>Confirmar nova senha</label>
              <input
                type="password" required value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: "var(--red)" }}>
              {loading ? "SALVANDO..." : "ATUALIZAR SENHA"}
            </button>
          </form>
        )}

      </main>
    </div>
  );
}
