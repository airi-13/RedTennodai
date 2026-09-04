-- 管理者がカレンダー画面から自由に追加できる予定(単発授業・先生の予定・塾の予定)。
-- 学校行事(school_events)は既存の仕組みをそのまま使うため、ここには含めない。
CREATE TABLE calendar_events (
  id            SERIAL PRIMARY KEY,
  event_type    TEXT NOT NULL CHECK (event_type IN ('lesson', 'teacher', 'juku')),
  event_date    DATE NOT NULL,
  start_time    TIME,                              -- teacher/juku用(自由入力)。lessonはperiod_idを使う
  end_time      TIME,
  period_id     INTEGER REFERENCES periods(id),     -- lesson用
  subject_id    INTEGER REFERENCES subjects(id),    -- lesson用
  title         TEXT NOT NULL,
  note          TEXT,
  visibility    TEXT NOT NULL DEFAULT 'admin_only' CHECK (visibility IN ('admin_only', 'selected', 'all')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_calendar_events_date ON calendar_events(event_date);

-- 対象生徒との紐付け。lessonタイプはここに出欠(attendance_status)も持たせる
-- (通常授業と同じ「未確定→出席/欠席/遅刻/無断欠席」の流れにするため、
--  attendance_recordsとは別で、確定前のnull状態を持てるようにしている)。
CREATE TABLE calendar_event_students (
  event_id           INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  student_id         INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attendance_status  TEXT CHECK (attendance_status IN ('present', 'absent', 'late', 'no_show')),
  PRIMARY KEY (event_id, student_id)
);

CREATE INDEX idx_calendar_event_students_student ON calendar_event_students(student_id);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_students ENABLE ROW LEVEL SECURITY;

-- 生徒は「全員に表示」の予定、または自分が対象に選ばれている予定のみ閲覧できる。
-- 「管理者のみ」はどちらにも該当しないので生徒には見えない。
CREATE POLICY "students select visible calendar events" ON calendar_events
  FOR SELECT TO authenticated
  USING (
    visibility = 'all'
    OR id IN (
      SELECT ces.event_id FROM calendar_event_students ces
      JOIN students s ON s.id = ces.student_id
      WHERE s.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "students select own calendar event link" ON calendar_event_students
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));
