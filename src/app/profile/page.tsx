import ProfileClient from "@/components/profile/ProfileClient";
import { getProfilePageData } from "@/server/services/app";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const { profile } = await getProfilePageData();
  const tab = searchParams.tab === "password" ? "password" : "nickname";

  return <ProfileClient profile={profile} initialTab={tab} />;
}
