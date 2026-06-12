"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  COMPETITIVE_DIVISIONS,
  getWeightClassLabel,
} from "@/lib/ufc-weight";
import Navbar from "@/components/layout/Navbar";
import { readApiResponse } from "@/lib/api";
import type { Profile } from "@/types";
import type { MeResponse } from "@/types/api";
import { createAuthClient } from "@/lib/supabase/client";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";
import BadgeGrid from "@/components/badges/BadgeGrid";

export default function ProfileClient({
  profile: initialProfile,
  initialTab,
}: {
  profile: Profile;
  initialTab: "nickname" | "division" | "password" | "badges";
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"nickname" | "division" | "password" | "badges">(initialTab);
  const [nickname, setNickname] = useState(initialProfile.nickname);
  const [division, setDivision] = useState(initialProfile.division);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleProfileUpdate(
    payload: { nickname?: string; division?: Profile["division"] },
    successMessage: string,
  ) {
    setLoading(true);
    try {
      const data = await readApiResponse<MeResponse>(
        await fetch("/api/me/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );

      toast.success(successMessage);
      setProfile(data.profile);
      setNickname(data.profile.nickname);
      setDivision(data.profile.division);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateNickname(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname || nickname === profile.nickname) return;
    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
      toast.error("Nickname: apenas letras, números e _");
      return;
    }
    if (nickname.length < 3 || nickname.length > 20) {
      toast.error("Nickname deve ter entre 3 e 20 caracteres.");
      return;
    }

    await handleProfileUpdate({ nickname }, "Nickname atualizado!");
  }

  async function handleUpdateDivision(e: React.FormEvent) {
    e.preventDefault();
    if (division === profile.division) return;
    await handleProfileUpdate({ division }, "Categoria atualizada!");
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createAuthClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });

      if (signInErr) {
        toast.error("Senha atual incorreta.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Senha atualizada!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setLoading(false);
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

  const labelClass =
    "block text-xs font-700 uppercase tracking-widest mb-2 font-condensed";

  return (
    <div className="min-h-screen pb-24 md:pb-0" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar profile={profile} />

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="red-line">
            <span className="section-title" style={{ fontSize: "1.75rem" }}>
              MEU PERFIL
            </span>
          </div>

          <div
            className="flex items-center gap-4 mt-4 p-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--red)",
            }}
          >
            <div
              className="w-12 h-12 flex items-center justify-center font-condensed font-900 text-xl text-white flex-shrink-0"
              style={{ backgroundColor: "var(--red)" }}
            >
              {profile.nickname[0].toUpperCase()}
            </div>
            <div>
              <p
                className="font-condensed font-900 text-lg uppercase tracking-wide"
                style={{ color: "var(--text)" }}
              >
                {profile.nickname}
              </p>
              <p
                className="font-condensed font-600 text-xs uppercase tracking-widest"
                style={{ color: "var(--text-secondary)" }}
              >
                {profile.first_name} {profile.last_name}
              </p>
              <p
                className="font-condensed font-700 text-xs uppercase tracking-widest mt-1"
                style={{ color: "var(--red)" }}
              >
                {profile.total_points} pontos
              </p>
              <p
                className="font-condensed font-600 text-xs uppercase tracking-widest mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Categoria: {getWeightClassLabel(profile.division)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-0 mb-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--border)" }}>
          {(["nickname", "division", "password", "badges"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className="relative font-condensed font-700 text-xs uppercase tracking-widest px-4 md:px-6 py-2.5 transition-all whitespace-nowrap"
              style={{ color: tab === item ? "var(--red)" : "var(--text-muted)" }}
            >
              {item === "nickname"
                ? "Nickname"
                : item === "division"
                  ? "Categoria"
                  : item === "password"
                    ? "Senha"
                    : "Conquistas"}
              {tab === item && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: "var(--red)" }}
                />
              )}
            </button>
          ))}
        </div>

        {tab === "nickname" && (
          <form onSubmit={handleUpdateNickname} className="space-y-5">
            <div>
              <label className={labelClass} style={{ color: "var(--text-secondary)" }}>
                Novo Nickname
              </label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                minLength={3}
                maxLength={20}
                required
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                3–20 caracteres · letras, números e _ · atual:{" "}
                <span style={{ color: "var(--red)" }}>{profile.nickname}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || nickname === profile.nickname}
              className="w-full py-3.5 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: "var(--red)" }}
            >
              {loading ? "SALVANDO..." : "SALVAR NICKNAME"}
            </button>
          </form>
        )}

        {tab === "division" && (
          <form onSubmit={handleUpdateDivision} className="space-y-5">
            <div>
              <label className={labelClass} style={{ color: "var(--text-secondary)" }}>
                Categoria ranqueada
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value as Profile["division"])}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              >
                {COMPETITIVE_DIVISIONS.map((value) => (
                  <option key={value} value={value}>
                    {getWeightClassLabel(value)}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                Essa categoria define em qual ranking ranqueado você compete.
                Você continua fazendo picks do card inteiro normalmente.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || division === profile.division}
              className="w-full py-3.5 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: "var(--red)" }}
            >
              {loading ? "SALVANDO..." : "SALVAR CATEGORIA"}
            </button>
          </form>
        )}

        {tab === "password" && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className={labelClass} style={{ color: "var(--text-secondary)" }}>
                Senha atual
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--text-secondary)" }}>
                Nova senha
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--text-secondary)" }}>
                Confirmar nova senha
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-condensed font-900 text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: "var(--red)" }}
            >
              {loading ? "SALVANDO..." : "ATUALIZAR SENHA"}
            </button>
          </form>
        )}

        {tab === "badges" && (
          <div>
            <div className="red-line mb-6">
              <span className="section-title">CONQUISTAS</span>
            </div>
            <BadgeGrid />
          </div>
        )}

        {tab !== "badges" && (
          <div className="mt-12">
            <NotificationPreferences />
          </div>
        )}
      </main>
    </div>
  );
}
