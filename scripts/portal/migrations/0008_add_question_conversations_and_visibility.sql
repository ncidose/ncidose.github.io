ALTER TABLE qa_questions ADD COLUMN author_name TEXT;
ALTER TABLE qa_questions ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public_after_review'
  CHECK (visibility IN ('public_after_review', 'team_only'));

ALTER TABLE qa_answers ADD COLUMN author_name TEXT;
ALTER TABLE qa_answers ADD COLUMN parent_answer_id TEXT;
ALTER TABLE qa_answers ADD COLUMN message_type TEXT NOT NULL DEFAULT 'response'
  CHECK (message_type IN ('request', 'response', 'follow_up', 'status_update'));

UPDATE qa_questions
SET author_name=(SELECT users.display_name FROM users WHERE users.id=qa_questions.submitted_by_user_id)
WHERE source='portal' AND author_name IS NULL AND submitted_by_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qa_answers_parent ON qa_answers(parent_answer_id, sort_order, created_at);
