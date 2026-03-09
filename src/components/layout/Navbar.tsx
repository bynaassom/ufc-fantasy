"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types";
import { getDisplayName, getDisplaySubtitle } from "@/lib/utils";

// Singleton — fallback para páginas que não passam profile via prop
let cachedProfile: Profile | null = null;

interface NavbarProps {
  profile?: Profile | null;
}

export default function Navbar({ profile: profileProp }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Se vier via prop (server), usa direto. Senão, busca client-side (fallback)
  const [profile, setProfile] = useState<Profile | null>(
    profileProp ?? cachedProfile,
  );
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Se já temos profile (via prop ou cache), não busca novamente
    if (profile) {
      if (!cachedProfile) cachedProfile = profile;
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            cachedProfile = data;
            setProfile(data);
          }
        });
    });
  }, [profile]);

  // Atualiza cache quando prop muda (ex: navegação)
  useEffect(() => {
    if (profileProp) {
      cachedProfile = profileProp;
      setProfile(profileProp);
    }
  }, [profileProp]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("#user-menu")) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleLogout() {
    cachedProfile = null;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const navLinks = [
    { href: "/home", label: "INÍCIO" },
    { href: "/ranking", label: "RANKING" },
    ...(profile?.role === "admin" ? [{ href: "/admin", label: "ADMIN" }] : []),
  ];

  const isActive = (href: string) => pathname.startsWith(href);
  const logo = (
    <img
      src="/logo-dark.svg"
      alt="UFC Fantasy"
      className="h-5"
      width={113}
      height={20}
    />
  );

  return (
    <>
      {/* ── DESKTOP ── */}
      <nav
        className="hidden md:block sticky top-0 z-50"
        style={{
          backgroundColor: "var(--bg)",
          borderBottom: "3px solid var(--red)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/home" className="flex items-center">
            {logo}
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative font-condensed font-700 text-xs uppercase tracking-widest px-4 py-2 transition-all hover:opacity-80"
                style={{
                  color: isActive(link.href)
                    ? "var(--red)"
                    : "var(--text-secondary)",
                }}
              >
                {link.label}
                {isActive(link.href) && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: "var(--red)" }}
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div id="user-menu" className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 transition-all hover:opacity-80"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-card)",
                  }}
                >
                  <div
                    className="w-6 h-6 flex items-center justify-center font-condensed font-900 text-xs text-white"
                    style={{ backgroundColor: "var(--red)" }}
                  >
                    {getDisplayName(profile)[0].toUpperCase()}
                  </div>
                  <span
                    className="font-condensed font-700 text-xs uppercase tracking-widest"
                    style={{ color: "var(--text)" }}
                  >
                    {getDisplayName(profile)}
                  </span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{
                      color: "var(--text-muted)",
                      transform: menuOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s",
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-52 z-50 slide-down"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderTop: "2px solid var(--red)",
                    }}
                  >
                    <div
                      className="px-4 py-3"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <p
                        className="font-condensed font-900 text-sm uppercase tracking-wide"
                        style={{ color: "var(--text)" }}
                      >
                        {getDisplayName(profile)}
                      </p>
                      {getDisplaySubtitle(profile) && (
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {getDisplaySubtitle(profile)}
                        </p>
                      )}
                      <p
                        className="font-condensed font-700 text-xs uppercase tracking-widest mt-1"
                        style={{ color: "var(--red)" }}
                      >
                        {profile.total_points} pontos
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-4 py-3 font-condensed font-700 text-xs uppercase tracking-widest transition-all hover:opacity-70"
                      style={{
                        borderBottom: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Meu Perfil
                    </Link>
                    <Link
                      href="/profile?tab=password"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-4 py-3 font-condensed font-700 text-xs uppercase tracking-widest transition-all hover:opacity-70"
                      style={{
                        borderBottom: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Alterar Senha
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-3 font-condensed font-700 text-xs uppercase tracking-widest transition-all hover:opacity-70"
                      style={{ color: "var(--red)" }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sair
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── MOBILE BOTTOM BAR ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 navbar-mobile-safe"
        style={{
          backgroundColor: "var(--bg)",
          borderTop: "2px solid var(--red)",
        }}
      >
        <div className="flex items-center justify-around h-14">
          {[
            {
              href: "/home",
              label: "INÍCIO",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                  <path d="M9 21V12h6v9" />
                </svg>
              ),
            },
            {
              href: "/ranking",
              label: "RANKING",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="18" y="3" width="3" height="18" rx="1" />
                  <rect x="10.5" y="8" width="3" height="13" rx="1" />
                  <rect x="3" y="13" width="3" height="8" rx="1" />
                </svg>
              ),
            },
            {
              href: "/profile",
              label: "PERFIL",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ),
            },
            ...(profile?.role === "admin"
              ? [
                  {
                    href: "/admin",
                    label: "ADMIN",
                    icon: (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ),
                  },
                ]
              : []),
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-0.5 px-4 py-2"
              style={{
                color: isActive(link.href) ? "var(--red)" : "var(--text-muted)",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {link.icon}
              <span
                className="font-condensed font-700 uppercase tracking-widest"
                style={{ fontSize: "9px" }}
              >
                {link.label}
              </span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-4 py-2"
            style={{
              color: "var(--text-muted)",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span
              className="font-condensed font-700 uppercase tracking-widest"
              style={{ fontSize: "9px" }}
            >
              SAIR
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
