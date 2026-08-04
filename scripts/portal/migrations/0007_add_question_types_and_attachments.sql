ALTER TABLE qa_questions ADD COLUMN request_type TEXT NOT NULL DEFAULT 'technical_question'
  CHECK (request_type IN ('technical_question', 'bug_report', 'feature_request'));
ALTER TABLE qa_questions ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1));

CREATE TABLE IF NOT EXISTS qa_attachments (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  answer_id TEXT REFERENCES qa_answers(id) ON DELETE CASCADE,
  uploaded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qa_attachments_question ON qa_attachments(question_id, created_at);
CREATE INDEX IF NOT EXISTS idx_qa_attachments_answer ON qa_attachments(answer_id, created_at);
