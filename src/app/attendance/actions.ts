"use server";

import { revalidatePath } from "next/cache";
import { upsertAttendance, deleteAttendanceRecord, updateMakeupDestinationStatus } from "@/lib/data/attendance";
import { addSchedule } from "@/lib/data/schedules";
import type { AttendanceStatus } from "@/lib/types";

export async function setAttendanceStatus(input: {
  studentId: number;
  date: string;
  periodId: number;
  subjectId: number;
  status: AttendanceStatus;
  makeupDate?: string | null;
  makeupPeriodId?: number | null;
  isTransferAddition?: boolean;
  attendanceRecordId?: number | null;
}) {
  if (input.isTransferAddition) {
    if (!input.attendanceRecordId) throw new Error("振替授業の元記録が見つかりません。");
    if (input.status !== "absent") throw new Error("振替授業では欠席のみ登録できます。");
    await updateMakeupDestinationStatus(input.attendanceRecordId, "absent");
    revalidatePath("/attendance");
    revalidatePath("/my");
    return;
  }

  if (input.status === "makeup" && (!input.makeupDate || !input.makeupPeriodId)) {
    throw new Error("振替日と振替コマを指定してから振替を登録してください。");
  }

  await upsertAttendance({
    student_id: input.studentId,
    date: input.date,
    period_id: input.periodId,
    subject_id: input.subjectId,
    status: input.status,
    makeup_date: input.status === "makeup" ? input.makeupDate ?? null : null,
    makeup_period_id: input.status === "makeup" ? input.makeupPeriodId ?? null : null,
    makeup_attendance_status: input.status === "makeup" ? null : null,
  });
  revalidatePath("/attendance");
  revalidatePath("/my");
}

export async function clearAttendanceRecord(id: number) {
  await deleteAttendanceRecord(id);
  revalidatePath("/attendance");
}

export async function addOneOffAttendance(input: {
  studentId: number;
  date: string;
  periodId: number;
  subjectId: number;
  status: AttendanceStatus;
}) {
  await upsertAttendance({ student_id: input.studentId, date: input.date, period_id: input.periodId, subject_id: input.subjectId, status: input.status });
  revalidatePath("/attendance");
}

export async function addStudentSchedule(input: {
  studentId: number;
  dayOfWeek: number;
  periodId: number;
  subjectId: number;
}) {
  await addSchedule({ student_id: input.studentId, day_of_week: input.dayOfWeek, period_id: input.periodId, subject_id: input.subjectId });
  revalidatePath("/attendance");
  revalidatePath("/students");
}
