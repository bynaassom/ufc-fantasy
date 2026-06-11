import { notFound } from "next/navigation";
import { getGroupDetail } from "@/server/services/app";
import { requirePageUserProfile } from "@/server/services/page-auth";
import Navbar from "@/components/layout/Navbar";
import GroupDetailClient from "@/components/groups/GroupDetailClient";

type Props = { params: { id: string } };

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({ params }: Props) {
  const { profile } = await requirePageUserProfile();
  const group = await getGroupDetail(params.id);
  if (!group) notFound();

  return (
    <div className="min-h-screen pb-24 md:pb-10" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <GroupDetailClient group={group} currentUserId={profile.id} />
      </main>
    </div>
  );
}
