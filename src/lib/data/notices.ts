import { supabase } from "@/lib/supabase";

export type Notice = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

export async function listRecentNotices(limit = 5): Promise<Notice[]> {
  const { data, error } = await supabase
    .from("notices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function createNotice(input: { title: string; body?: string }): Promise<Notice> {
  const { data, error } = await supabase.from("notices").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function deleteNotice(id: string) {
  const { error } = await supabase.from("notices").delete().eq("id", id);
  if (error) throw error;
}
