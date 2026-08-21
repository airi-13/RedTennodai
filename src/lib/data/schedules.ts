import { supabase } from "@/lib/supabase";
import type { StudentSchedule } from "@/lib/types";

export async function getSchedulesForStudent(
  studentId: number
): Promise<StudentSchedule[]> {
  const { data, error } = await supabase
    .from("student_schedules")
    .select("*")
    .eq("student_id", studentId)
    .order("day_of_week")
    .order("period_id");
  if (error) throw error;
  return data;
}

export async function getSchedulesForDay(
  dayOfWeek: number
): Promise<StudentSchedule[]> {
  const { data, error } = await supabase
    .from("student_schedules")
    .select("*")
    .eq("day_of_week", dayOfWeek);
  if (error) throw error;
  return data;
}

export async function getAllSchedules(): Promise<StudentSchedule[]> {
  const { data, error } = await supabase
    .from("student_schedules")
    .select("*")
    .order("day_of_week")
    .order("period_id");
  if (error) throw error;
  return data;
}

export async function addSchedule(input: {
  student_id: number;
  day_of_week: number;
  period_id: number;
  subject_id: number;
}): Promise<StudentSchedule> {
  const { data, error } = await supabase
    .from("student_schedules")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSchedule(id: number) {
  const { error } = await supabase.from("student_schedules").delete().eq("id", id);
  if (error) throw error;
}

// 業務ルール本体は lib/schedule-rules.ts (クライアントからも安全にimport可能)
export { isValidEightyMinutePair } from "@/lib/schedule-rules";
