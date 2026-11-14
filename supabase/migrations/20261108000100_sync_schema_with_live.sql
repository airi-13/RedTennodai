-- 本番DBには存在するが、docs/schema.sql と既存のマイグレーションのどちらにも記録されていなかった定義を追記する。
-- (ドキュメント上のずれの解消が目的。以下はすべて本番に適用済みで、冪等なので本番に流しても結果は変わらない。
--  これが無いと、記録だけから環境を作り直したときに、生徒画面が各テーブルを読めなくなる。)

-- 管理者用TODOの作成日時
ALTER TABLE admin_todos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 生徒(authenticated)が参照できるマスタ系テーブルの読み取りポリシー。
-- 書き込みは管理画面(service role)だけが行うため、INSERT/UPDATE/DELETEのポリシーは付けない。
DROP POLICY IF EXISTS schools_select_authenticated ON schools;
CREATE POLICY schools_select_authenticated ON schools FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS school_events_select_authenticated ON school_events;
CREATE POLICY school_events_select_authenticated ON school_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS schedule_announcements_select_authenticated ON schedule_announcements;
CREATE POLICY schedule_announcements_select_authenticated ON schedule_announcements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS calendar_closures_select_authenticated ON calendar_closures;
CREATE POLICY calendar_closures_select_authenticated ON calendar_closures FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pricing_rules_select_authenticated ON pricing_rules;
CREATE POLICY pricing_rules_select_authenticated ON pricing_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS textbooks_select_authenticated ON textbooks;
CREATE POLICY textbooks_select_authenticated ON textbooks FOR SELECT TO authenticated USING (true);

-- 学校行事の索引: 学校ごとに日付順で引くため (school_id, event_date) の複合索引を使う
DROP INDEX IF EXISTS idx_school_events_date;
CREATE INDEX IF NOT EXISTS idx_school_events_school_date ON school_events (school_id, event_date);
