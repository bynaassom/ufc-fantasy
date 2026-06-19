import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import FighterProfileClient from "@/components/fighter/FighterProfileClient";
import { getFighterProfileData } from "@/server/services/fighter-profile";
import { getUserSupabase } from "@/server/supabase";
import { findProfileById } from "@/server/repositories/profiles";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const data = await getFighterProfileData(params.slug);
    return {
      title: `${data.fighter.name} · Lutador · UFC Fantasy`,
      description: `Perfil de ${data.fighter.name}: recorde, estatísticas, histórico recente e desempenho no fantasy.`,
    };
  } catch {
    return { title: "Lutador · UFC Fantasy" };
  }
}

export default async function FighterProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  let profileData;
  try {
    profileData = await getFighterProfileData(params.slug);
  } catch {
    notFound();
  }

  let navbarProfile = null;
  try {
    const supabase = await getUserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const p = await findProfileById(supabase, user.id);
      if (p && !p.is_banned) {
        navbarProfile = p;
      }
    }
  } catch {
    // Not authenticated — skip Navbar
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      {navbarProfile && <Navbar profile={navbarProfile} />}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <FighterProfileClient
          fighter={profileData.fighter}
          form={profileData.form}
          pickStats={profileData.pickStats}
          slug={params.slug}
        />
      </main>
    </div>
  );
}
