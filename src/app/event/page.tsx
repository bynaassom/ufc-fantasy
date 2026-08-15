import { redirect } from "next/navigation";
import { getHomePageData } from "@/server/services/app";

export const dynamic = "force-dynamic";

export default async function CurrentEventPage() {
  const { currentEvent } = await getHomePageData();
  redirect(currentEvent ? `/event/${currentEvent.slug}` : "/home");
}
