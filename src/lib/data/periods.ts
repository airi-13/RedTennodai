import { supabase } from "@/lib/supabase";
import type { Period, PeriodAvailability } from "@/lib/types";

export async function getPeriods(): Promise<Period[]> {
  const { data, error } = await supabase
    .from("periods")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getPeriodAvailabilityForDay(
  dayOfWeek: number
): Promise<PeriodAvailability[]> {
  const { data, error } = await supabase
    .from("period_availability")
    .select("*")
    .eq("day_of_week", dayOfWeek);
  if (error) throw error;
  return data;
}

export async function getAllPeriodAvailability(): Promise<PeriodAvailability[]> {
  const { data, error } = await supabase.from("period_availability").select("*");
  if (error) throw error;
  return data;
}

export async function setPeriodAvailability(
  dayOfWeek: number,
  periodId: number,
  isOpen: boolean,
  capacity?: number | null
) {
  const payload: { is_open: boolean; capacity?: number | null } = { is_open: isOpen };
  if (capacity !== undefined) payload.capacity = capacity;
  const { error } = await supabase
    .from("period_availability")
    .update(payload)
    .eq("day_of_week", dayOfWeek)
    .eq("period_id", periodId);
  if (error) throw error;
}

// 曜日×コマごとの在籍中の生徒数(定期スケジュールの件数)。
// 開講枠の上限に対して、今どれくらい埋まっているかを表示するために使う。
export async function getEnrollmentCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("student_schedules")
    .select("day_of_week, period_id, students!inner(status)")
    .eq("students.status", "active");
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of (data ?? []) as any[]) {
    const key = `${row.day_of_week}:${row.period_id}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}
