export const dynamic = "force-dynamic";

import Navbar from "@/components/layout/Navbar";
import ChatClient from "@/components/chat/ChatClient";
import { requirePageUserProfile } from "@/server/services/page-auth";

export default async function ChatPage() {
  const { profile } = await requirePageUserProfile();

  return (
    <div
      className="min-h-[100dvh] pb-20 md:pb-0"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Navbar profile={profile} />
      <main className="max-w-4xl mx-auto px-4 py-8" style={{ height: "calc(100vh - 4rem)" }}>
        <ChatClient />
      </main>
    </div>
  );
}
