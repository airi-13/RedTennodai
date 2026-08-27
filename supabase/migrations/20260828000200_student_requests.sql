-- 生徒向け申請フォーム（欠席・振替以外）
CREATE TABLE student_requests (
  id            SERIAL PRIMARY KEY,
  student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  request_type  TEXT NOT NULL CHECK (request_type IN (
    'textbook_purchase',
    'interview',
    'lesson_count_change',
    'fixed_slot_change'
  )),
  details       JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_student_requests_updated_at
  BEFORE UPDATE ON student_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_student_requests_student ON student_requests(student_id);
CREATE INDEX idx_student_requests_status ON student_requests(status);
CREATE INDEX idx_student_requests_requested_at ON student_requests(requested_at);

ALTER TABLE student_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students select own student requests" ON student_requests
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));

CREATE POLICY "students insert own student requests" ON student_requests
  FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid()));
