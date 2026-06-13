import Navbar from "@/components/layout/Navbar";
import AdminClient from "@/components/admin/AdminClient";
import { getAdminPageData } from "@/server/services/app";

export default async function AdminPage() {
  const { profile, isAdmin, userId, events, users } = await getAdminPageData();

  if (!isAdmin) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div
          className="text-center p-8"
          style={{ border: "1px solid var(--border)" }}
        >
          <p
            className="font-condensed font-900 text-xl uppercase tracking-wide mb-2"
            style={{ color: "var(--red)" }}
          >
            Acesso Negado
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            Role atual: <strong>{profile?.role || "null"}</strong>
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Para se tornar admin, rode no Supabase SQL Editor:
          </p>
          <code
            className="block mt-2 p-3 text-xs text-left"
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text)",
            }}
          >
            UPDATE profiles SET role = &apos;admin&apos; WHERE id = &apos;
            {userId}&apos;;
          </code>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] md:pb-0"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Navbar profile={profile} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div
          className="mb-8 pb-6"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="red-line">
            <span className="section-title" style={{ fontSize: "1.75rem" }}>
              PAINEL ADMIN
            </span>
          </div>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Logado como{" "}
            <span style={{ color: "var(--red)" }}>{profile.nickname}</span>
          </p>
        </div>

        <AdminClient
          events={events || []}
          users={users || []}
        />
      </main>
    </div>
  );
}
