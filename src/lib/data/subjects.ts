import { supabase } from "@/lib/supabase";
import type { Subject } from "@/lib/types";

export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}
