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

export async function getAllPeriodAvailability(): Promise<
  PeriodAvailability[]
> {
  const { data, error } = await supabase.from("period_availability").select("*");
  if (error) throw error;
  return data;
}

export async function setPeriodAvailability(
  dayOfWeek: number,
  periodId: number,
  isOpen: boolean
) {
  const { error } = await supabase
    .from("period_availability")
    .update({ is_open: isOpen })
    .eq("day_of_week", dayOfWeek)
    .eq("period_id", periodId);
  if (error) throw error;
}
