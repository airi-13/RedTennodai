-- 科目マスタを「英語・国語・数学・理科・社会・QUREO」の6科目に整理する。
-- 既存のstudent_schedulesが参照している可能性があるため、使用中の科目は
-- 削除せずname/codeを付け替える(安全のためDELETEは未使用の場合のみ)。

-- 'Japanese' → '国語' に名称変更(codeはJのまま)
UPDATE subjects SET name = '国語' WHERE code = 'J';

-- 理科・社会が無ければ追加
INSERT INTO subjects (code, name, sort_order)
SELECT 'R', '理科', 6
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'R');

INSERT INTO subjects (code, name, sort_order)
SELECT 'SH', '社会', 7
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'SH');

-- sort_orderを整理: 英語・国語・数学・理科・社会・QUREOの順
UPDATE subjects SET sort_order = 1 WHERE code = 'E';   -- 英語
UPDATE subjects SET sort_order = 2 WHERE code = 'J';   -- 国語
UPDATE subjects SET sort_order = 3 WHERE code = 'M';   -- 数学
UPDATE subjects SET sort_order = 4 WHERE code = 'R';   -- 理科
UPDATE subjects SET sort_order = 5 WHERE code = 'SH';  -- 社会
UPDATE subjects SET sort_order = 6 WHERE code = 'Q';   -- QUREO

-- 'DOJO'(D)は使われていない場合のみ削除する。
-- 使用中(student_schedulesやattendance_recordsに参照が残っている)場合は、
-- 一覧の並び順を後ろに送るだけにして、データを壊さないようにする。
DELETE FROM subjects
WHERE code = 'D'
  AND NOT EXISTS (SELECT 1 FROM student_schedules WHERE subject_id = subjects.id)
  AND NOT EXISTS (SELECT 1 FROM attendance_records WHERE subject_id = subjects.id);

UPDATE subjects SET sort_order = 99 WHERE code = 'D';
