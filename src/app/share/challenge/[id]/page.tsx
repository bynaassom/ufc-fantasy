import { notFound } from "next/navigation";
import { getPublicChallengeShareData } from "@/server/services/app";
import ChallengeSharePage from "@/components/share/ChallengeSharePage";

export default async function ChallengeSharePageRoute({
  params,
}: {
  params: { id: string };
}) {
  const data = await getPublicChallengeShareData(params.id);
  if (!data) notFound();

  return <ChallengeSharePage data={data} />;
}
