import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventPickSharePage from "@/components/share/EventPickSharePage";
import { getPublicEventPickShareData } from "@/server/services/app";

type Params = {
  params: {
    slug: string;
    nickname: string;
  };
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await getPublicEventPickShareData(params.slug, params.nickname);
  if (!data) {
    return {
      title: "Picks UFC Fantasy",
      description: "Veja os picks de um jogador no UFC Fantasy.",
    };
  }

  return {
    title: `Picks de ${data.profile.nickname} no ${data.event.name} | UFC Fantasy`,
    description: `Veja os picks de ${data.profile.nickname} para o ${data.event.name}.`,
  };
}

export default async function SharePicksPage({ params }: Params) {
  const data = await getPublicEventPickShareData(params.slug, params.nickname);
  if (!data) notFound();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const shareUrl = `${baseUrl}/share/picks/${params.slug}/${params.nickname}`;

  return <EventPickSharePage data={data} shareUrl={shareUrl} />;
}
