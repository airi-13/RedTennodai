import type { AttendanceSlot } from "@/lib/types";

// 過去の不具合で、振替先のコマに別の出欠記録が重複して作られていた場合の表示上の後始末。
// 同じ生徒・同じコマに「振替先の行」がある場合は、重複している行を1つにまとめる
// (重複側に入っていた出欠は、振替先の出欠として引き継いで表示する)。
// 通常の定期スケジュールの行や、単発授業の行は対象外(消さない)。
export function mergeDuplicateTransferSlots(slots: AttendanceSlot[]): AttendanceSlot[] {
  const transferByKey = new Map<string, AttendanceSlot>();
  for (const s of slots) {
    if (s.isTransferAddition) transferByKey.set(`${s.studentId}:${s.periodId}`, s);
  }
  const result: AttendanceSlot[] = [];
  for (const s of slots) {
    const transfer = transferByKey.get(`${s.studentId}:${s.periodId}`);
    const isDuplicate = transfer && !s.isTransferAddition && s.scheduleId == null && s.calendarEventId == null;
    if (isDuplicate) {
      if (transfer.makeupAttendanceStatus == null && s.status && s.status !== "makeup") {
        transfer.status = s.status;
        transfer.makeupAttendanceStatus = s.status;
      }
      continue;
    }
    result.push(s);
  }
  return result;
}
