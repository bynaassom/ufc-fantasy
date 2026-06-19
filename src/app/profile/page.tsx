import ProfileClient from "@/components/profile/ProfileClient";
import { getProfilePageData } from "@/server/services/app";
import {
  getProfileXpSummary,
  getRecentXpEventsForUser,
} from "@/server/services/xp";
import { requirePageUserProfile } from "@/server/services/page-auth";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const { profile } = await getProfilePageData();
  const { user } = await requirePageUserProfile();
  const [xpSummary, xpHistory] = await Promise.all([
    getProfileXpSummary(user.id),
    getRecentXpEventsForUser(user.id, 10),
  ]);
  const tab =
    searchParams.tab === "password"
      ? "password"
      : searchParams.tab === "badges"
        ? "badges"
        : "nickname";

  return (
    <ProfileClient
      profile={profile}
      initialTab={tab}
      xpSummary={xpSummary}
      xpHistory={xpHistory}
    />
  );
}
