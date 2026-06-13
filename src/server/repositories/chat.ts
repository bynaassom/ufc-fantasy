import type { ChatMessage } from "@/types";

const MESSAGE_FIELDS = `
  id,
  user_id,
  group_id,
  content,
  is_hidden,
  hidden_by,
  hidden_at,
  created_at,
  profile:user_id!inner(nickname, first_name, last_name, role)
`;

export async function insertMessage(
  client: any,
  userId: string,
  content: string,
  groupId?: string | null,
): Promise<ChatMessage> {
  const payload: Record<string, unknown> = { user_id: userId, content };
  if (groupId) payload.group_id = groupId;

  const { data, error } = await client
    .from("chat_messages")
    .insert(payload)
    .select(MESSAGE_FIELDS)
    .single();

  if (error) throw error;
  return data;
}

export async function listMessages(
  client: any,
  limit = 50,
  beforeCreatedAt?: string | null,
  groupId?: string | null,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  let query = client
    .from("chat_messages")
    .select(MESSAGE_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (beforeCreatedAt) {
    query = query.lt("created_at", beforeCreatedAt);
  }

  if (groupId) {
    query = query.eq("group_id", groupId);
  } else {
    query = query.is("group_id", null);
  }

  const { data, error } = await query;

  if (error) throw error;

  const messages = (data || []) as ChatMessage[];
  const hasMore = messages.length > limit;

  return {
    messages: hasMore ? messages.slice(0, limit) : messages,
    hasMore,
  };
}

export async function listRecentMessages(
  client: any,
  since: string,
  groupId?: string | null,
): Promise<ChatMessage[]> {
  let query = client
    .from("chat_messages")
    .select(MESSAGE_FIELDS)
    .gt("created_at", since)
    .order("created_at", { ascending: true });

  if (groupId) {
    query = query.eq("group_id", groupId);
  } else {
    query = query.is("group_id", null);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as ChatMessage[];
}

export async function hideMessage(
  client: any,
  messageId: string,
  adminUserId: string,
): Promise<void> {
  const { error } = await client
    .from("chat_messages")
    .update({
      is_hidden: true,
      hidden_by: adminUserId,
      hidden_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (error) throw error;
}
