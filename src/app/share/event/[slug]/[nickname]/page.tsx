import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import EventResultSharePage from "@/components/share/EventResultSharePage";
import { buildPublicUrl, normalizePublicOrigin } from "@/lib/public-url";
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
  const requestHeaders = headers();
  const requestOrigin = normalizePublicOrigin(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"),
  );
  const baseUrl = normalizePublicOrigin(process.env.NEXT_PUBLIC_APP_URL) || requestOrigin;
  const shareUrl = buildPublicUrl(
    `/share/event/${params.slug}/${params.nickname}`,
    baseUrl,
  );

  return <EventResultSharePage data={data} shareUrl={shareUrl} />;
}
