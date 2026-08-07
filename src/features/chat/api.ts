import { supabase } from "@/lib/supabase";
import type { ChatMessage } from "@/types";

const HISTORY_LIMIT = 50;

export async function loadChatHistory(): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  return (data ?? [])
    .reverse()
    .map((row) => ({
      id: row.id,
      role: row.role as ChatMessage["role"],
      content: row.content,
      createdAt: row.created_at,
    }));
}

export async function saveChatMessage(role: ChatMessage["role"], content: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("chat_messages").insert({ user_id: user.id, role, content });
}
