-- 振替授業側の出欠を、振替元の記録とは独立して保持する。
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS makeup_attendance_status TEXT
  CHECK (makeup_attendance_status IS NULL OR makeup_attendance_status IN ('present','absent','late','makeup','no_show'));
