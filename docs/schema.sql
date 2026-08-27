-- =====================================================
-- RED教室 生徒管理・出欠管理システム
-- データベーススキーマ (PostgreSQL / Supabase)
-- =====================================================

-- 既存schemaのattendance_records定義に以下の列を追加。
-- 振替元レコードの status='makeup' を維持したまま、
-- 振替授業側の出欠(欠席)を独立して保持する。
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS makeup_attendance_status TEXT
  CHECK (makeup_attendance_status IS NULL OR makeup_attendance_status IN ('present','absent','late','makeup','no_show'));
