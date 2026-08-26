-- =====================================================
-- RED教室 生徒管理・出欠管理システム
-- データベーススキーマ (PostgreSQL / Supabase)
-- 作成日: 2026-08-20 / 更新: 2026-08-21
-- 設計方針・各テーブルの解説は database-schema.md を参照
-- =====================================================

-- updated_at 自動更新用トリガー関数（全テーブル共通）
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. periods（コママスタ）
-- =====================================================
CREATE TABLE periods (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,             -- 例: '①'
  start_time  TIME,
  end_time    TIME,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_periods_updated_at
  BEFORE UPDATE ON periods
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO periods (name, start_time, end_time, sort_order) VALUES
  ('①', '15:00', '15:40', 1),
  ('②', '15:45', '16:25', 2),
  ('③', '16:30', '17:10', 3),
  ('④', '17:15', '17:55', 4),
  ('⑤', '18:00', '18:40', 5),
  ('⑥', '18:45', '19:25', 6),
  ('⑦', '19:30', '20:10', 7),
  ('⑧', '20:15', '20:55', 8);

-- =====================================================
-- 2. period_availability（曜日別のコマ受付可否）
-- 曜日×コマの組み合わせごとに「その枠を受け付けるか」を管理者が設定する。
-- 全56通り(7曜日×8コマ)を明示的に投入し、行の有無ではなくis_openで判定する。
-- =====================================================
CREATE TABLE period_availability (
  id          SERIAL PRIMARY KEY,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=日〜6=土
  period_id   INTEGER NOT NULL REFERENCES periods(id),
  is_open     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (day_of_week, period_id)
);

CREATE TRIGGER trg_period_availability_updated_at
  BEFORE UPDATE ON period_availability
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 初期データ: 日曜終日クローズ／平日(月〜金)は④〜⑧のみ／土曜は①〜⑥のみ
-- period_idはハードコードせず、periods.nameとの結合で解決する
INSERT INTO period_availability (day_of_week, period_id, is_open)
SELECT v.dow, p.id, v.is_open
FROM (VALUES
  (0,'①',false),(0,'②',false),(0,'③',false),(0,'④',false),(0,'⑤',false),(0,'⑥',false),(0,'⑦',false),(0,'⑧',false), -- 日
  (1,'①',false),(1,'②',false),(1,'③',false),(1,'④',true), (1,'⑤',true), (1,'⑥',true), (1,'⑦',true), (1,'⑧',true),  -- 月
  (2,'①',false),(2,'②',false),(2,'③',false),(2,'④',true), (2,'⑤',true), (2,'⑥',true), (2,'⑦',true), (2,'⑧',true),  -- 火
  (3,'①',false),(3,'②',false),(3,'③',false),(3,'④',true), (3,'⑤',true), (3,'⑥',true), (3,'⑦',true), (3,'⑧',true),  -- 水
  (4,'①',false),(4,'②',false),(4,'③',false),(4,'④',true), (4,'⑤',true), (4,'⑥',true), (4,'⑦',true), (4,'⑧',true),  -- 木
  (5,'①',false),(5,'②',false),(5,'③',false),(5,'④',true), (5,'⑤',true), (5,'⑥',true), (5,'⑦',true), (5,'⑧',true),  -- 金
  (6,'①',true), (6,'②',true), (6,'③',true), (6,'④',true), (6,'⑤',true), (6,'⑥',true), (6,'⑦',false),(6,'⑧',false)  -- 土
) AS v(dow, period_name, is_open)
JOIN periods p ON p.name = v.period_name;

-- =====================================================
-- 3. subjects（科目マスタ）
-- =====================================================
CREATE TABLE subjects (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,      -- 旧文字列コード 'M','E','Q','J','D'
  name        TEXT NOT NULL,             -- '数学','英語','QUREO','Japanese','DOJO'
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO subjects (code, name, sort_order) VALUES
  ('M', '数学', 1),
  ('E', '英語', 2),
  ('Q', 'QUREO', 3),
  ('J', 'Japanese', 4),
  ('D', 'DOJO', 5);

-- =====================================================
-- 4. students（生徒）
-- =====================================================
CREATE TABLE students (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  name_kana     TEXT,
  gender        TEXT,
  school_level  TEXT,                    -- 小学生 / 中学生 / 高校生
  school_name   TEXT,                    -- 通学先の学校名(例: ○○小学校)
  grade         SMALLINT,                -- 学年
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  enrolled_on   DATE,
  note          TEXT,
  login_id      TEXT UNIQUE,             -- 生徒ログイン用ID(管理者が発行)
  auth_user_id  UUID UNIQUE,             -- Supabase Authのユーザーとの紐付け
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 5. student_schedules（生徒別定期スケジュール）
-- 80分授業(小5以上)の生徒は、同じ曜日・同じ科目で2行(連続コマ)を登録する。
-- 例: 火曜80分授業 → (火, ③, 算数) と (火, ④, 算数) の2行。
-- 「連続コマとして正しい組か」「奇数始まりの単独予約を弾くか」はアプリ側で検証する
-- （管理者操作時は警告のみで登録は許可する、という運用ルールのため）。
-- =====================================================
CREATE TABLE student_schedules (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=日〜6=土
  period_id   INTEGER NOT NULL REFERENCES periods(id),
  subject_id  INTEGER NOT NULL REFERENCES subjects(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, day_of_week, period_id)
);

CREATE TRIGGER trg_student_schedules_updated_at
  BEFORE UPDATE ON student_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_student_schedules_day ON student_schedules(day_of_week);

-- =====================================================
-- 6. attendance_requests（申請：欠席・振替）
-- =====================================================
CREATE TABLE attendance_requests (
  id               SERIAL PRIMARY KEY,
  student_id       INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  request_type     TEXT NOT NULL CHECK (request_type IN ('absence','makeup')),
  target_date      DATE NOT NULL,
  target_period_id INTEGER REFERENCES periods(id),
  reason           TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  makeup_date      DATE,
  makeup_period_id INTEGER REFERENCES periods(id),
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_attendance_requests_updated_at
  BEFORE UPDATE ON attendance_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_attendance_requests_student ON attendance_requests(student_id);
CREATE INDEX idx_attendance_requests_target_date ON attendance_requests(target_date);

-- =====================================================
-- 7. attendance_records（出欠記録）
-- =====================================================
CREATE TABLE attendance_records (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  period_id   INTEGER NOT NULL REFERENCES periods(id),
  subject_id  INTEGER NOT NULL REFERENCES subjects(id),
  status      TEXT NOT NULL CHECK (status IN ('present','absent','late','makeup')), -- makeup=この回自体が振替授業
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, date, period_id)
);

CREATE TRIGGER trg_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_attendance_records_date ON attendance_records(date);

-- =====================================================
-- RLS: 全テーブルで有効化し、ポリシーは追加しない。
-- Next.jsサーバー側からservice role keyのみでアクセスする設計のため、
-- anon/authenticatedキーからは一切アクセスできない状態にしておく。
-- =====================================================
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLSポリシー: 生徒本人(Supabase Auth経由でログイン)は自分の行だけ読める。
-- 申請(attendance_requests)は自分の分だけ作成もできる。
-- 管理画面はservice role keyを使うため、これらのポリシーの影響を受けない。
-- =====================================================
CREATE POLICY "students select own row" ON students
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "students select own schedule" ON student_schedules
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "students select own attendance" ON attendance_records
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "students select own requests" ON attendance_requests
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "students insert own requests" ON attendance_requests
  FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "students select periods" ON periods
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "students select subjects" ON subjects
  FOR SELECT TO authenticated USING (true);

-- =====================================================
-- 【2026-08-25追記】以下、admin-calendar/materials機能などで
-- 実際にSupabase上へ作成済みだがschema.sqlへの追記が漏れていたテーブル群。
-- コード(src/lib/data/*.ts)の実際の使用箇所から逆算して記載しているため、
-- 型・制約の細部は必ずSupabase側の実テーブル定義と突き合わせて確認すること。
-- =====================================================

-- =====================================================
-- 8. schools（学校マスタ）
-- 生徒の通学先の学校名を正規化するマスタ。生徒登録時にfindOrCreateSchoolByName()で
-- 学校名から自動的に取得/新規作成される。school_events の紐付け先。
-- =====================================================
CREATE TABLE schools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- students.school_id（未追記だった生徒⇔学校の外部キー）
ALTER TABLE students
  ADD COLUMN school_id UUID REFERENCES schools(id);

-- =====================================================
-- 9. school_events（学校行事）
-- 学校ごとの行事予定。生徒本人の月次カレンダー(/my)に自校の行事として表示する。
-- =====================================================
CREATE TABLE school_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  event_date  DATE NOT NULL,
  title       TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_school_events_date ON school_events(event_date);

-- =====================================================
-- 10. calendar_closures（休講・特別開講の例外設定）
-- デフォルト休講曜日(日・月)に対する、1日単位の例外(特別開講/追加休講)。
-- 日付ごとに1行のみ持たせる想定で、upsert(closure_date基準)で運用する。
-- =====================================================
CREATE TABLE calendar_closures (
  closure_date  DATE PRIMARY KEY,
  status        TEXT NOT NULL CHECK (status IN ('closed', 'open')),
  note          TEXT
);

-- =====================================================
-- 11. schedule_announcements（塾からのお知らせ）
-- 生徒本人の月次カレンダー(/my)に日付紐付けで表示するお知らせ。
-- =====================================================
CREATE TABLE schedule_announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date  DATE NOT NULL,
  title       TEXT NOT NULL,
  time_range  TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_announcements_date ON schedule_announcements(event_date);

-- =====================================================
-- 12. admin_todos（管理者用TODO）
-- /admin-calendar で管理者が日付に紐付けて管理するTODOメモ。
-- =====================================================
CREATE TABLE admin_todos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_date  DATE NOT NULL,
  content    TEXT NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_admin_todos_date ON admin_todos(todo_date);

-- =====================================================
-- 13. pricing_rules（学年別料金）
-- 学年区分(grade_label)ごとの1コマあたり単価。/my/pricingの料金シミュレーションで使用。
-- grade_labelを主キーとしupsertで運用する。
-- =====================================================
CREATE TABLE pricing_rules (
  grade_label     TEXT PRIMARY KEY,
  price_per_slot  INTEGER NOT NULL
);

-- =====================================================
-- 14. textbooks（使用テキスト）
-- 科目・学年別の使用テキスト一覧。/materials(管理画面)・/my/textbooks(生徒側)で使用。
-- =====================================================
CREATE TABLE textbooks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject      TEXT NOT NULL,
  title        TEXT NOT NULL,
  publisher    TEXT,
  description  TEXT,
  grade_label  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- attendance_records: 振替(makeup)先の日時カラムを追記
-- status='makeup'の場合、振替先の日付・コマをここに記録する。
-- (承認フロー・出欠画面の振替表示で実際に使われているが、記載が漏れていた)
-- =====================================================
ALTER TABLE attendance_records
  ADD COLUMN makeup_date      DATE,
  ADD COLUMN makeup_period_id INTEGER REFERENCES periods(id);

-- =====================================================
-- 追加テーブルのRLS方針: 上記の管理系テーブルと同様、
-- 画面はすべてservice role key経由(Next.jsサーバー)からのみアクセスするため、
-- authenticated/anonロールへのポリシーは付与しない(RLS有効化のみ)。
-- =====================================================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 15. textbooks 初期データ投入(2026-08-25)
-- =====================================================
INSERT INTO textbooks (subject, title, description, grade_label) VALUES
-- 小学生
('英語', 'Ⅰ', '小学生・英検5級相当', NULL),
('英語', 'Ⅱ', '小学生・英検4級相当', NULL),
('英語', 'Ⅲ', '小学生・英検3級相当', NULL),
('国語', '国語', '小学生', '小5'),
('国語', '国語', '小学生', '小6'),
('算数', 'フォレスタ', '小学生', '小３'),
('算数', 'フォレスタ', '小学生', '小4'),
('算数', 'フォレスタ', '小学生', '小5'),
('算数', 'フォレスタ', '小学生', '小6'),
('算数', 'FS', '小学生', '小３'),
('算数', 'FS', '小学生', '小4'),
('算数', 'FS', '小学生', '小5'),
('算数', 'FS', '小学生', '小6'),
('算数', 'ドリル', '小学生', '小３'),
('算数', 'ドリル', '小学生', '小4'),
('算数', 'ドリル', '小学生', '小5'),
('算数', 'ドリル', '小学生', '小6'),
('英数', '中学準備講座', '小学生', '新中1'),
-- 中学生
('英語', 'フォレスタ', '中学生', '中１'),
('英語', 'フォレスタ', '中学生', '中２'),
('英語', 'フォレスタ', '中学生', '中3'),
('英語', 'FS', '中学生', '中１'),
('英語', 'FS', '中学生', '中２'),
('英語', 'FS', '中学生', '中3'),
('英語', 'ドリル', '中学生', '中１'),
('英語', 'ドリル', '中学生', '中２'),
('英語', 'ドリル', '中学生', '中3'),
('英語', 'ゴール', '中学生', '全学年'),
('英語', '英単語', '中学生', '全学年'),
('国語', 'ＦＳ', '中学生', '全学年'),
('国語', 'ゴール', '中学生', '全学年'),
('数学', 'フォレスタ', '中学生', '中１'),
('数学', 'フォレスタ', '中学生', '中２'),
('数学', 'フォレスタ', '中学生', '中3'),
('数学', 'FS', '中学生', '中１'),
('数学', 'FS', '中学生', '中２'),
('数学', 'FS', '中学生', '中3'),
('数学', 'ドリル', '中学生', '中１'),
('数学', 'ドリル', '中学生', '中２'),
('数学', 'ドリル', '中学生', '中3'),
('数学', 'ゴール', '中学生', '全学年'),
('理科', 'フォレスタ', '中学生', '中１'),
('理科', 'フォレスタ', '中学生', '中２'),
('理科', 'フォレスタ', '中学生', '中3'),
('理科', 'FS', '中学生', '全学年'),
('理科', 'ゴール', '中学生', '全学年'),
('社会', 'フォレスタ', '中学生', '地理'),
('社会', 'フォレスタ', '中学生', '歴史'),
('社会', 'フォレスタ', '中学生', '公民'),
('社会', 'FS', '中学生', '全学年'),
('社会', 'ゴール', '中学生', '全学年'),
('英数', '高校準備講座', '中学生', '新高１'),
-- 高校生
('英語', 'フォレスタ', '高校生', '英文法Ⅰ'),
('英語', 'フォレスタ', '高校生', '英語構文'),
('国語', 'フォレスタ', '高校生', '言語文化'),
('国語', 'フォレスタ', '高校生', '小論文'),
('数学', 'フォレスタ', '高校生', 'Ⅰ'),
('数学', 'フォレスタ', '高校生', 'Ⅱ'),
('数学', 'フォレスタ', '高校生', 'Ⅲ'),
('数学', 'フォレスタ', '高校生', 'Ａ'),
('数学', 'フォレスタ', '高校生', 'Ｂ'),
('数学', 'フォレスタ', '高校生', 'Ｃ'),
('理科', 'フォレスタ', '高校生', '物理基礎'),
('理科', 'フォレスタ', '高校生', '化学基礎'),
('理科', 'フォレスタ', '高校生', '生物基礎'),
('理科', 'フォレスタ', '高校生', '物理'),
('理科', 'フォレスタ', '高校生', '化学'),
('理科', 'フォレスタ', '高校生', '生物'),
('社会', 'フォレスタ', '高校生', '地理総合'),
('社会', 'フォレスタ', '高校生', '歴史総合');
