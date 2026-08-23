import { redirect } from "next/navigation";
import { getCurrentCompanionEvent } from "@/server/services/app";

export const dynamic = "force-dynamic";

export default async function CompanionPage() {
  const event = await getCurrentCompanionEvent();
  redirect(event ? `/companion/${event.slug}` : "/");
}
