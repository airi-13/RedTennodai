"use server";

import { revalidatePath } from "next/cache";
import { upsertAttendance, deleteAttendanceRecord } from "@/lib/data/attendance";
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
}) {
  await upsertAttendance({
    student_id: input.studentId,
    date: input.date,
    period_id: input.periodId,
    subject_id: input.subjectId,
    status: input.status,
    makeup_date: input.status === "makeup" ? input.makeupDate ?? null : null,
    makeup_period_id: input.status === "makeup" ? input.makeupPeriodId ?? null : null,
  });
  revalidatePath("/attendance");
}

export async function clearAttendanceRecord(id: number) {
  await deleteAttendanceRecord(id);
  revalidatePath("/attendance");
}

// その日だけの追加出席(振替の受け入れなど、定期スケジュールにない枠)を登録する。
// 定期スケジュール自体は変えず、その日のattendance_recordsに1行作るだけ。
export async function addOneOffAttendance(input: {
  studentId: number;
  date: string;
  periodId: number;
  subjectId: number;
  status: AttendanceStatus;
}) {
  await upsertAttendance({
    student_id: input.studentId,
    date: input.date,
    period_id: input.periodId,
    subject_id: input.subjectId,
    status: input.status,
  });
  revalidatePath("/attendance");
}

// 生徒の定期スケジュールに1コマ追加する(生徒管理側からも使うが、動線上ここにも置く)
export async function addStudentSchedule(input: {
  studentId: number;
  dayOfWeek: number;
  periodId: number;
  subjectId: number;
}) {
  await addSchedule({
    student_id: input.studentId,
    day_of_week: input.dayOfWeek,
    period_id: input.periodId,
    subject_id: input.subjectId,
  });
  revalidatePath("/attendance");
  revalidatePath("/students");
}
