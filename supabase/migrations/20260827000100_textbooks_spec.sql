-- 教材の区分・学年・科目を新仕様へ統一
-- 既存教材データは一旦全削除する。

ALTER TABLE textbooks
  ADD COLUMN IF NOT EXISTS level TEXT;

-- 既存教材は今回すべて破棄するため、levelを埋める必要はない。
DELETE FROM textbooks;

ALTER TABLE textbooks
  ALTER COLUMN level SET NOT NULL;

ALTER TABLE textbooks
  DROP CONSTRAINT IF EXISTS textbooks_level_check;
ALTER TABLE textbooks
  ADD CONSTRAINT textbooks_level_check
  CHECK (level IN ('小学生', '中学生', '高校生'));

ALTER TABLE textbooks
  DROP CONSTRAINT IF EXISTS textbooks_subject_check;
ALTER TABLE textbooks
  ADD CONSTRAINT textbooks_subject_check
  CHECK (subject IN ('英語', '国語', '数学', '理科', '社会'));

ALTER TABLE textbooks
  DROP CONSTRAINT IF EXISTS textbooks_level_grade_check;
ALTER TABLE textbooks
  ADD CONSTRAINT textbooks_level_grade_check
  CHECK (
    (level = '小学生' AND grade_label IN ('1年','2年','3年','4年','5年','6年','新中1')) OR
    (level = '中学生' AND grade_label IN ('1年','2年','3年','新高1')) OR
    (level = '高校生' AND grade_label IN ('1年','2年','3年'))
  );

-- 区分を補足説明として使う旧運用を終了する。
-- description は純粋な補足情報として残す。
