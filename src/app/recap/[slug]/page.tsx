import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import EventRecapContent from "@/components/recap/EventRecapContent";
import { getEventRecapData } from "@/server/services/app";
import { requirePageUserProfile } from "@/server/services/page-auth";

type Params = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const supabaseModule = await import("@/lib/supabase/server");
  const supabase = await supabaseModule.createClient();
  const { data } = await supabase.from("events").select("name").eq("slug", params.slug).maybeSingle();
  return {
    title: data?.name ? `Recap: ${data.name} | UFC Fantasy` : "Recap | UFC Fantasy",
  };
}

export default async function RecapPage({ params }: Params) {
  const { profile } = await requirePageUserProfile();
  const data = await getEventRecapData(params.slug);
  if (!data) notFound();

  return (
    <div className="min-h-screen pb-24 md:pb-10" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar profile={profile} />
      <EventRecapContent data={data} />
    </div>
  );
}
