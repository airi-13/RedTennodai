import { supabase } from "@/lib/supabase";
import type { Student } from "@/lib/types";

export async function getStudents(includeInactive = false): Promise<Student[]> {
  let query = supabase.from("students").select("*").order("name");
  if (!includeInactive) {
    query = query.eq("status", "active");
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getStudent(id: number): Promise<Student | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type NewStudent = {
  name: string;
  name_kana?: string | null;
  school_level?: string | null;
  grade?: number | null;
  enrolled_on?: string | null;
  note?: string | null;
};

export async function createStudent(input: NewStudent): Promise<Student> {
  const { data, error } = await supabase
    .from("students")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStudentStatus(
  id: number,
  status: "active" | "inactive"
) {
  const { error } = await supabase
    .from("students")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
