import { supabase } from "@/lib/supabase";

export type AdminTodo = {
  id: string;
  todo_date: string;
  content: string;
  done: boolean;
};

export async function listTodosForMonth(
  year: number,
  month: number
): Promise<AdminTodo[]> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("admin_todos")
    .select("*")
    .gte("todo_date", start)
    .lte("todo_date", end)
    .order("todo_date");
  if (error) throw error;
  return data ?? [];
}

export async function createTodo(input: {
  todo_date: string;
  content: string;
}): Promise<AdminTodo> {
  const { data, error } = await supabase
    .from("admin_todos")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleTodoDone(id: string, done: boolean) {
  const { error } = await supabase.from("admin_todos").update({ done }).eq("id", id);
  if (error) throw error;
}

export async function deleteTodo(id: string) {
  const { error } = await supabase.from("admin_todos").delete().eq("id", id);
  if (error) throw error;
}
