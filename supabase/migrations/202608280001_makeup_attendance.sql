-- 振替授業の出欠を元コマから独立して保持する。
-- 元コマ: attendance_records.status = 'makeup'
-- 振替授業: attendance_records.makeup_date / makeup_period_id
-- 振替授業を欠席した場合: makeup_attendance_status = 'absent'
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS makeup_date DATE,
  ADD COLUMN IF NOT EXISTS makeup_period_id INTEGER REFERENCES periods(id),
  ADD COLUMN IF NOT EXISTS makeup_attendance_status TEXT;

ALTER TABLE attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_makeup_attendance_status_check;

ALTER TABLE attendance_records
  ADD CONSTRAINT attendance_records_makeup_attendance_status_check
  CHECK (
    makeup_attendance_status IS NULL
    OR makeup_attendance_status IN ('present', 'absent', 'late', 'makeup', 'no_show')
  );

CREATE INDEX IF NOT EXISTS idx_attendance_records_makeup_date
  ON attendance_records(makeup_date);

CREATE INDEX IF NOT EXISTS idx_attendance_records_makeup_destination
  ON attendance_records(student_id, makeup_date, makeup_period_id)
  WHERE makeup_date IS NOT NULL AND makeup_period_id IS NOT NULL;

COMMENT ON COLUMN attendance_records.makeup_attendance_status IS
  '振替授業側の出欠。元コマのstatusとは独立。振替授業で欠席しても再振替は行わない。';
