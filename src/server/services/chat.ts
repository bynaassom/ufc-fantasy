import type { ChatMessage } from "@/types";
import {
  insertMessage,
  listMessages,
  listRecentMessages,
  hideMessage,
} from "@/server/repositories/chat";
import { requireActiveUser, requireAdmin } from "@/server/auth/guards";

export async function sendMessage(
  content: string,
  groupId?: string | null,
): Promise<ChatMessage> {
  const { supabase, user } = await requireActiveUser();
  return insertMessage(supabase, user.id, content, groupId);
}

export async function getMessages(
  beforeCreatedAt?: string | null,
  groupId?: string | null,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const { supabase } = await requireActiveUser();
  return listMessages(supabase, 50, beforeCreatedAt, groupId);
}

export async function pollNewMessages(
  since: string,
  groupId?: string | null,
): Promise<ChatMessage[]> {
  const { supabase } = await requireActiveUser();
  return listRecentMessages(supabase, since, groupId);
}

export async function hideChatMessage(
  messageId: string,
): Promise<void> {
  const { adminSupabase, user } = await requireAdmin();
  return hideMessage(adminSupabase, messageId, user.id);
}
