import ChallengesClient from "@/components/challenges/ChallengesClient";
import { getChallengesPageData } from "@/server/services/app";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const data = await getChallengesPageData();

  return (
    <ChallengesClient
      profile={data.profile}
      userId={data.userId}
      incoming={data.incoming as any}
      outgoing={data.outgoing as any}
      active={data.active as any}
      history={data.history as any}
      notifications={data.notifications}
      unreadCount={data.unreadCount}
    />
  );
}
