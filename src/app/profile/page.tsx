import ProfileClient from "@/components/profile/ProfileClient";
import { getProfilePageData } from "@/server/services/app";

export default async function ProfilePage(
  props: {
    searchParams: Promise<{ tab?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const { profile } = await getProfilePageData();
  const tab =
    searchParams.tab === "password"
      ? "password"
      : searchParams.tab === "badges"
        ? "badges"
        : "nickname";

  return <ProfileClient profile={profile} initialTab={tab} />;
}
