import { notFound } from "next/navigation";
import ChallengeDetailClient from "@/components/challenges/ChallengeDetailClient";
import { getChallengeDetailPageData } from "@/server/services/app";

type Props = {
  params: { id: string };
};

export const dynamic = "force-dynamic";

export default async function ChallengeDetailPage({ params }: Props) {
  const data = await getChallengeDetailPageData(params.id);

  if (!data.challenge) {
    notFound();
  }

  return (
    <ChallengeDetailClient
      profile={data.profile}
      userId={data.userId}
      challenge={data.challenge as any}
      comparisons={data.comparisons}
      picksVisible={data.picksVisible}
      nextEvent={data.nextEvent as any}
    />
  );
}
