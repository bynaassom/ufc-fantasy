import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import EventPickSharePage from "@/components/share/EventPickSharePage";
import { buildPublicUrl, normalizePublicOrigin } from "@/lib/public-url";
import { getPublicEventPickShareData } from "@/server/services/app";

type Params = {
  params: Promise<{
    slug: string;
    nickname: string;
  }>;
};

export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;
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

export default async function SharePicksPage(props: Params) {
  const params = await props.params;
  const data = await getPublicEventPickShareData(params.slug, params.nickname);
  if (!data) notFound();
  const requestHeaders = await headers();
  const requestOrigin = normalizePublicOrigin(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"),
  );
  const baseUrl = normalizePublicOrigin(process.env.NEXT_PUBLIC_APP_URL) || requestOrigin;
  const shareUrl = buildPublicUrl(
    `/share/picks/${params.slug}/${params.nickname}`,
    baseUrl,
  );

  return <EventPickSharePage data={data} shareUrl={shareUrl} />;
}
