-- 定期スケジュール(student_schedules)に有効期間を持たせる。
-- 変更は「変更した翌日以降」のみ反映し、当日以前の日付の予定は変えないため、
-- 古い行は effective_until(終了日)を入れて残し、新しい行は effective_from=翌日 で追加する。
--   effective_from : この行が有効になる最初の日(既存の行は '2000-01-01' = ずっと前から有効)
--   effective_until: この行が有効な最後の日(NULL = 現在も有効)

-- 1) 既存の「同じ生徒・同じ曜日・同じコマは1行だけ」というUNIQUE制約を外す
--    (有効期間が違えば同じコマの行が複数あってよくなるため)。
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'student_schedules'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE student_schedules DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- 2) 有効期間の列を追加
ALTER TABLE student_schedules ADD COLUMN IF NOT EXISTS effective_from DATE NOT NULL DEFAULT '2000-01-01';
ALTER TABLE student_schedules ADD COLUMN IF NOT EXISTS effective_until DATE;

-- 3) 「同じ生徒が同じ曜日・同じコマに、期間が重なって二重に登録される」ことだけを防ぐ制約
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE student_schedules
  ADD CONSTRAINT student_schedules_no_overlap
  EXCLUDE USING gist (
    student_id WITH =,
    day_of_week WITH =,
    period_id WITH =,
    daterange(effective_from, effective_until, '[]') WITH &&
  );
