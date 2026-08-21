// database-schema.md / schema.sql に対応する型定義

export type Period = {
  id: number;
  name: string; // '①'〜'⑧'
  start_time: string | null; // 'HH:MM:SS'
  end_time: string | null;
  sort_order: number;
};

export type PeriodAvailability = {
  id: number;
  day_of_week: number; // 0=日〜6=土
  period_id: number;
  is_open: boolean;
};

export type Subject = {
  id: number;
  code: string; // 'M' | 'E' | 'Q' | 'J' | 'D'
  name: string;
  sort_order: number;
};

export type StudentStatus = "active" | "inactive";

export type Student = {
  id: number;
  name: string;
  name_kana: string | null;
  school_level: string | null;
  grade: number | null;
  status: StudentStatus;
  enrolled_on: string | null;
  note: string | null;
};

export type StudentSchedule = {
  id: number;
  student_id: number;
  day_of_week: number;
  period_id: number;
  subject_id: number;
};

export type AttendanceStatus = "present" | "absent" | "late" | "makeup";

export type AttendanceRecord = {
  id: number;
  student_id: number;
  date: string; // 'YYYY-MM-DD'
  period_id: number;
  subject_id: number;
  status: AttendanceStatus;
  note: string | null;
};

// 画面表示用: その日・そのコマに来る予定の生徒1人分
// student_schedules(定期予定)にattendance_records(その日の上書き)を重ねた結果
export type AttendanceSlot = {
  // 定期スケジュールの行がある場合はそのid、振替追加分などで無ければnull
  scheduleId: number | null;
  studentId: number;
  studentName: string;
  periodId: number;
  subjectId: number;
  // attendance_recordsに行があればそのidとstatus、無ければ未確定(null)
  attendanceRecordId: number | null;
  status: AttendanceStatus | null;
  note: string | null;
};
