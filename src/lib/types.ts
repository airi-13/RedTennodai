// database-schema.md / schema.sql に対応する型定義

export type Period = {
  id: number;
  name: string; // '①'〜'⑧'
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
};

export type PeriodAvailability = {
  id: number;
  day_of_week: number;
  period_id: number;
  is_open: boolean;
};

export type Subject = {
  id: number;
  code: string;
  name: string;
  sort_order: number;
};

export type StudentStatus = "active" | "inactive";
export type Student = {
  id: number;
  name: string;
  name_kana: string | null;
  school_level: string | null;
  school_name: string | null;
  grade: number | null;
  status: StudentStatus;
  enrolled_on: string | null;
  note: string | null;
  login_id: string | null;
  auth_user_id: string | null;
};

export type StudentSchedule = {
  id: number;
  student_id: number;
  day_of_week: number;
  period_id: number;
  subject_id: number;
};

export type AttendanceStatus = "present" | "absent" | "late" | "makeup" | "no_show";

export type AttendanceRecord = {
  id: number;
  student_id: number;
  date: string;
  period_id: number;
  subject_id: number;
  status: AttendanceStatus;
  note: string | null;
  makeup_date?: string | null;
  makeup_period_id?: number | null;
  makeup_attendance_status?: AttendanceStatus | null;
};

export type AttendanceSlot = {
  scheduleId: number | null;
  studentId: number;
  studentName: string;
  periodId: number;
  subjectId: number;
  attendanceRecordId: number | null;
  status: AttendanceStatus | null;
  note: string | null;
  makeupDate: string | null;
  makeupPeriodId: number | null;
  makeupAttendanceStatus?: AttendanceStatus | null;
  isTransferAddition?: boolean;
  transferFromDate?: string | null;
  transferFromPeriodId?: number | null;
};

export type RequestType = "absence" | "makeup";
export type RequestStatus = "pending" | "approved" | "rejected";
export type AttendanceRequest = {
  id: number;
  student_id: number;
  request_type: RequestType;
  target_date: string;
  target_period_id: number | null;
  reason: string | null;
  status: RequestStatus;
  makeup_date: string | null;
  makeup_period_id: number | null;
  requested_at: string;
  processed_at: string | null;
};

export type AttendanceRequestWithStudent = AttendanceRequest & { studentName: string };
