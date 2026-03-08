import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import AdminClient from "@/components/admin/AdminClient";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Debug no terminal — verifique se role está chegando como "admin"
  console.log(
    "[Admin] email:",
    user.email,
    "| role:",
    profile?.role,
    "| raw:",
    JSON.stringify(profile),
  );

  // Se não for admin, mostra mensagem em vez de redirecionar silenciosamente
  // (útil para debug — troque redirect por mensagem temporariamente)
  if (!profile || profile.role !== "admin") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
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
            {user.id}&apos;;
          </code>
        </div>
      </div>
    );
  }

  const [eventsRes, usersRes] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false })
      .limit(20),
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div
      className="min-h-screen pb-24 md:pb-10"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Navbar />
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
          events={eventsRes.data || []}
          users={usersRes.data || []}
        />
      </main>
    </div>
  );
}
