PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS qa_questions (
  id TEXT PRIMARY KEY,
  tool TEXT NOT NULL CHECK (tool IN ('NCICT', 'NCIRF', 'NCINM', 'PHANTOM', 'General')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'draft', 'published', 'archived')),
  source TEXT NOT NULL DEFAULT 'portal' CHECK (source IN ('portal', 'github_discussions', 'admin')),
  source_ref TEXT UNIQUE,
  submitted_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS qa_answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  response_type TEXT NOT NULL DEFAULT 'team' CHECK (response_type IN ('team', 'community')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT REFERENCES users(id),
  source_ref TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qa_questions_public ON qa_questions(status, published_at, created_at);
CREATE INDEX IF NOT EXISTS idx_qa_questions_user ON qa_questions(submitted_by_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_qa_answers_question ON qa_answers(question_id, sort_order, created_at);
