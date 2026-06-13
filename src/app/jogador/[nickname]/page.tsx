import { notFound } from "next/navigation";
import PublicProfileClient from "@/components/profile/PublicProfileClient";
import { getPublicProfilePageData } from "@/server/services/app";

type Props = {
  params: { nickname: string };
};

export default async function PublicProfilePage({ params }: Props) {
  const data = await getPublicProfilePageData(params.nickname);

  if (!data.publicProfile || !data.stats) {
    notFound();
  }

  return (
    <PublicProfileClient
      viewerProfile={data.viewerProfile}
      profile={data.publicProfile}
      stats={data.stats}
      currentEvent={data.currentEvent}
      existingChallenge={data.existingChallenge}
      canChallenge={data.canChallenge}
      badges={data.badges as any[]}
      rivalry={data.rivalry as any}
    />
  );
}
