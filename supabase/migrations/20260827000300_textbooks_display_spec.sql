-- RED Tennodai 教材マスタの正式表示仕様
-- 数学は内部カテゴリを共通化し、小学生では「算数」と表示する。
-- 英数教材は英語・数学の両方に紐付ける。

UPDATE textbooks
SET subjects = CASE
  WHEN title IN ('フォレスタ中学準備講座 数学・英語', 'フォレスタ高校準備講座 数学Ⅰ・英文法Ⅰ')
    THEN ARRAY['英語','数学']::TEXT[]
  ELSE subjects
END,
subject = CASE
  WHEN title IN ('フォレスタ中学準備講座 数学・英語', 'フォレスタ高校準備講座 数学Ⅰ・英文法Ⅰ')
    THEN '英語'
  ELSE subject
END;

ALTER TABLE textbooks
  DROP CONSTRAINT IF EXISTS textbooks_subject_check;

ALTER TABLE textbooks
  ADD CONSTRAINT textbooks_subject_check
  CHECK (
    subject IN ('英語', '国語', '数学', '理科', '社会')
    AND subjects <@ ARRAY['英語', '国語', '数学', '理科', '社会']::TEXT[]
    AND cardinality(subjects) > 0
  );
