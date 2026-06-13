import { getEnrichedMyGroups } from "@/server/services/app";
import { requirePageUserProfile } from "@/server/services/page-auth";
import Navbar from "@/components/layout/Navbar";
import GroupsClient from "@/components/groups/GroupsClient";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const { profile } = await requirePageUserProfile();
  const groups = await getEnrichedMyGroups();

  return (
    <div className="min-h-[100dvh] pb-24 md:pb-0" style={{ backgroundColor: "var(--bg)" }}>
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p
              className="font-condensed font-700 text-xs uppercase tracking-widest"
              style={{ color: "var(--text-secondary)" }}
            >
              Social
            </p>
            <h1
              className="font-condensed font-900 text-3xl uppercase tracking-wide mt-1"
              style={{ color: "var(--text)" }}
            >
              Minhas Ligas
            </h1>
          </div>
        </div>

        <GroupsClient groups={groups} />
      </main>
    </div>
  );
}
