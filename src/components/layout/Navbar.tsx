"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DropdownMenu } from "radix-ui";
import { Profile } from "@/types";
import { getDisplayName, getDisplaySubtitle } from "@/lib/utils";
import NotificationBell from "./NotificationBell";
import PushNotificationManager from "./PushNotificationManager";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import BrandLogo from "@/components/ui/BrandLogo";
import PwaInstallButton from "./PwaInstallButton";

interface NavbarProps {
  profile: Profile;
}

export default function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    document.body.classList.add("has-mobile-nav");
    return () => document.body.classList.remove("has-mobile-nav");
  }, []);

  async function handleLogout() {
    const { createAuthClient } = await import("@/lib/supabase/client");
    const supabase = createAuthClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const navLinks = [
    { href: "/home", label: "INÍCIO" },
    { href: "/event", label: "EVENTO" },
    { href: "/ranking", label: "RANKING" },
    { href: "/desafios", label: "DESAFIOS" },
    { href: "/ligas", label: "LIGAS" },
    { href: "/historico", label: "HISTÓRICO" },
    ...(profile.role === "admin" ? [{ href: "/admin", label: "ADMIN" }] : []),
  ];

  const isActive = (href: string) => {
    if (href === "/home") return pathname === href;
    return pathname.startsWith(href + "/") || pathname === href;
  };
  const isMoreActive = ["/desafios", "/profile", "/historico", "/admin"].some(
    isActive,
  );
  const logo = <BrandLogo priority />;

  return (
    <ThemeProvider>
      <Dialog.Root open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
      <PushNotificationManager variant="mobile" />

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
                aria-current={isActive(link.href) ? "page" : undefined}
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
            <ThemeToggle />
            {profile && (
              <NotificationBell />
            )}
            {profile && (
              <PushNotificationManager />
            )}
            {profile && (
              <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenu.Trigger asChild>
                  <button
                    aria-label={`Abrir menu de ${getDisplayName(profile)}`}
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
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={4}
                    className="z-[80] w-52 outline-none slide-down"
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
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/profile"
                        className="radix-menu-item flex items-center gap-3 w-full px-4 py-3 font-condensed font-700 text-xs uppercase tracking-widest"
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
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/profile?tab=password"
                        className="radix-menu-item flex items-center gap-3 w-full px-4 py-3 font-condensed font-700 text-xs uppercase tracking-widest"
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
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <button
                        onClick={handleLogout}
                        className="radix-menu-item flex items-center gap-3 w-full px-4 py-3 font-condensed font-700 text-xs uppercase tracking-widest"
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
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )}
          </div>
        </div>
      </nav>

      {/* ── MOBILE BOTTOM BAR ── */}
      {portalReady && createPortal(
        <nav
          className="md:hidden navbar-mobile-safe"
          style={{
            backgroundColor: "var(--bg)",
            borderTop: "2px solid var(--red)",
          }}
        >
        <div className="flex items-center justify-around h-14">
          {[
            { href: "/home", label: "INÍCIO", icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                <path d="M9 21V12h6v9" />
              </svg>
            )},
            { href: "/event", label: "PICKS", icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            )},
            { href: "/ranking", label: "RANKING", icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="18" y="3" width="3" height="18" rx="1" />
                <rect x="10.5" y="8" width="3" height="13" rx="1" />
                <rect x="3" y="13" width="3" height="8" rx="1" />
              </svg>
            )},
            { href: "/ligas", label: "LIGAS", icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            )},
          ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className="flex flex-1 min-w-0 min-tap flex-col items-center gap-0.5 px-1 py-1"
                style={{
                  color: isActive(link.href!) ? "var(--red)" : "var(--text-muted)",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {link.icon}
                <span className="font-condensed font-700 uppercase tracking-widest" style={{ fontSize: "9px" }}>
                  {link.label}
                </span>
              </Link>
          ))}

          {/* MAIS toggle */}
          <Dialog.Trigger asChild>
            <button
              className="flex flex-1 min-w-0 min-tap flex-col items-center gap-0.5 px-1 py-1"
              style={{
                color:
                  moreMenuOpen || isMoreActive
                    ? "var(--red)"
                    : "var(--text-muted)",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
              aria-label="Mais opções"
              aria-controls="mobile-more-menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
              <span className="font-condensed font-700 uppercase tracking-widest" style={{ fontSize: "9px" }}>
                MAIS
              </span>
            </button>
          </Dialog.Trigger>
        </div>
      </nav>,
      document.body
      )}

      {/* ── MOBILE MORE MENU ── */}
      <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-[60] md:hidden"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          />
          <Dialog.Content
            id="mobile-more-menu"
            aria-describedby={undefined}
            className="fixed bottom-0 left-0 right-0 z-[70] md:hidden outline-none"
            style={{
              backgroundColor: "var(--bg)",
              borderTop: "2px solid var(--red)",
              paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            <div className="flex items-center justify-between px-4 h-12">
              <Dialog.Title className="font-condensed font-900 text-sm uppercase tracking-widest" style={{ color: "var(--text)" }}>
                Navegação
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="flex items-center justify-center w-8 h-8"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="Fechar"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: "var(--border)" }}>
              {[
                { href: "/desafios", label: "DESAFIOS", icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 12h6l3-7 3 14 3-7h3" />
                  </svg>
                )},
                { href: "/profile", label: "PERFIL", icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )},
                { href: "/historico", label: "HISTÓRICO", icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )},
                ...(profile?.role === "admin"
                  ? [{
                      href: "/admin",
                      label: "ADMIN",
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ),
                    }]
                  : []),
              ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreMenuOpen(false)}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    className="flex flex-col items-center justify-center gap-1.5 p-5 min-h-[80px]"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      color: isActive(link.href) ? "var(--red)" : "var(--text-secondary)",
                    }}
                  >
                    {link.icon}
                    <span className="font-condensed font-700 text-[10px] uppercase tracking-widest" style={{ color: "var(--text)" }}>
                      {link.label}
                    </span>
                  </Link>
              ))}
            </div>

            {/* Toggles row */}
            <div className="flex items-center justify-around px-4 py-4" style={{ borderTop: "1px solid var(--border)" }}>
              <ThemeToggle />
              <NotificationBell variant="mobile" />
            </div>
            <PwaInstallButton />
          </Dialog.Content>
      </Dialog.Portal>
      </Dialog.Root>
    </ThemeProvider>
  );
}
