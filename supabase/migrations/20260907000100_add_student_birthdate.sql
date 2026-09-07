-- 生徒に生年月日を追加する(学年とPassの間に表示するための列)。
-- noteは既存カラムをそのまま「備考」として使う。
ALTER TABLE students ADD COLUMN IF NOT EXISTS birthdate DATE;
