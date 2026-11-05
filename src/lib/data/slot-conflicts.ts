import { supabase } from "@/lib/supabase";
import { dayOfWeekFromDateString } from "@/lib/data/attendance";
import { activeOnOrFilter } from "@/lib/schedule-effective";

export const SLOT_CONFLICT_MESSAGE = "その日・そのコマには、すでに別の授業が入っています。別のコマを選んでください。";

// 振替先に選んだ「日付・コマ」に、その生徒の授業がすでに入っていないかを調べる。
// (同じコマに同じ生徒が2人入ってしまうのを防ぐ。入っていればエラーメッセージ、なければnullを返す。)
// 次のどれかに当てはまれば、すでに授業が入っているとみなす:
//  ・その曜日・コマに通常の定期スケジュールがある
//  ・その日・そのコマの出欠記録がすでにある
//  ・別の欠席コマの振替先として、すでにそのコマが選ばれている
//  ・管理者が追加した単発授業がそのコマにある
// exclude: 変更中の振替自身(自分の記録)は競合とみなさないための指定。
export async function findSlotConflict(
  studentId: number,
  date: string,
  periodId: number,
  exclude?: { recordId?: number | null; originDate?: string; originPeriodId?: number }
): Promise<string | null> {
  const dayOfWeek = dayOfWeekFromDateString(date);

  const [schedule, ownRecord, makeupRows, eventLink] = await Promise.all([
    supabase
      .from("student_schedules")
      .select("id")
      .eq("student_id", studentId)
      .eq("day_of_week", dayOfWeek)
      .eq("period_id", periodId)
      .lte("effective_from", date)
      .or(activeOnOrFilter(date))
      .limit(1),
    supabase
      .from("attendance_records")
      .select("id")
      .eq("student_id", studentId)
      .eq("date", date)
      .eq("period_id", periodId)
      .limit(1),
    supabase
      .from("attendance_records")
      .select("id, date, period_id")
      .eq("student_id", studentId)
      .eq("makeup_date", date)
      .eq("makeup_period_id", periodId),
    supabase
      .from("calendar_event_students")
      .select("event_id, calendar_events!inner(event_date, period_id, event_type)")
      .eq("student_id", studentId)
      .eq("calendar_events.event_date", date)
      .eq("calendar_events.period_id", periodId)
      .eq("calendar_events.event_type", "lesson")
      .limit(1),
  ]);
  for (const r of [schedule, ownRecord, makeupRows, eventLink]) {
    if (r.error) throw r.error;
  }

  const otherMakeups = (makeupRows.data ?? []).filter((r: any) => {
    if (exclude?.recordId != null && r.id === exclude.recordId) return false;
    if (exclude?.originDate && r.date === exclude.originDate && r.period_id === exclude.originPeriodId) return false;
    return true;
  });

  if (
    (schedule.data?.length ?? 0) > 0 ||
    (ownRecord.data?.length ?? 0) > 0 ||
    otherMakeups.length > 0 ||
    (eventLink.data?.length ?? 0) > 0
  ) {
    return SLOT_CONFLICT_MESSAGE;
  }
  return null;
}
