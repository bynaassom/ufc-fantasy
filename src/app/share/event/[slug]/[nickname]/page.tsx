import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventResultSharePage from "@/components/share/EventResultSharePage";
import { getPublicEventResultShareData } from "@/server/services/app";

type Params = {
  params: {
    slug: string;
    nickname: string;
  };
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await getPublicEventResultShareData(params.slug, params.nickname);
  if (!data) {
    return {
      title: "Resultado UFC Fantasy",
      description: "Veja resultados e picks no UFC Fantasy.",
    };
  }

  return {
    title: `${data.profile.nickname} no ${data.event.name} | UFC Fantasy`,
    description: `Veja o resultado de ${data.profile.nickname} no ${data.event.name}.`,
  };
}

export default async function ShareEventResultPage({ params }: Params) {
  const data = await getPublicEventResultShareData(params.slug, params.nickname);
  if (!data) notFound();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const shareUrl = `${baseUrl}/share/event/${params.slug}/${params.nickname}`;

  return <EventResultSharePage data={data} shareUrl={shareUrl} />;
}
