PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  institution TEXT,
  country TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  sta_status TEXT NOT NULL DEFAULT 'approved',
  access_status TEXT NOT NULL DEFAULT 'active' CHECK (access_status IN ('pending', 'active', 'suspended')),
  approval_source TEXT NOT NULL DEFAULT 'google_group',
  approved_at TEXT,
  group_joined_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,
  provider_subject TEXT,
  normalized_email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_subject)
);

CREATE TABLE IF NOT EXISTS login_challenges (
  id TEXT PRIMARY KEY,
  normalized_email TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  identity_id TEXT REFERENCES user_identities(id),
  code_hash TEXT,
  request_ip_hash TEXT NOT NULL,
  attempts_remaining INTEGER NOT NULL DEFAULT 5,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  identity_id TEXT NOT NULL REFERENCES user_identities(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS membership_imports (
  id TEXT PRIMARY KEY,
  source_filename TEXT NOT NULL,
  source_sha256 TEXT NOT NULL UNIQUE,
  total_rows INTEGER NOT NULL,
  eligible_rows INTEGER NOT NULL,
  pending_rows INTEGER NOT NULL,
  imported_by TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_memberships (
  normalized_email TEXT PRIMARY KEY,
  group_status TEXT NOT NULL,
  portal_eligible INTEGER NOT NULL DEFAULT 0,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_import_id TEXT NOT NULL REFERENCES membership_imports(id)
);

CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  institutional_email TEXT NOT NULL,
  institution TEXT NOT NULL,
  country TEXT NOT NULL,
  requested_tools TEXT NOT NULL,
  research_use TEXT NOT NULL,
  workflow_status TEXT NOT NULL DEFAULT 'awaiting_sta',
  executed_sta_confirmed_at TEXT,
  activated_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  event_type TEXT NOT NULL,
  object_key TEXT,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Release' CHECK (category IN ('Release', 'Maintenance', 'Access')),
  audience TEXT NOT NULL DEFAULT 'approved_users' CHECK (audience IN ('approved_users', 'public')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  original_published_at TEXT,
  published_at TEXT,
  source_url TEXT,
  source_message_id TEXT UNIQUE,
  created_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  user_id TEXT NOT NULL REFERENCES users(id),
  announcement_id TEXT NOT NULL REFERENCES announcements(id),
  read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, announcement_id)
);

CREATE TABLE IF NOT EXISTS announcement_email_deliveries (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL REFERENCES announcements(id),
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_broadcast_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  recipient_count INTEGER,
  requested_by_user_id TEXT REFERENCES users(id),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(announcement_id)
);

CREATE TABLE IF NOT EXISTS qa_questions (
  id TEXT PRIMARY KEY,
  tool TEXT NOT NULL CHECK (tool IN ('NCICT', 'NCIRF', 'NCINM', 'PHANTOM', 'General')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'draft', 'published', 'archived')),
  source TEXT NOT NULL DEFAULT 'portal' CHECK (source IN ('portal', 'github_discussions', 'admin')),
  request_type TEXT NOT NULL DEFAULT 'technical_question' CHECK (request_type IN ('technical_question', 'bug_report', 'feature_request')),
  is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
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

CREATE INDEX IF NOT EXISTS idx_user_identities_email ON user_identities(normalized_email);
CREATE INDEX IF NOT EXISTS idx_login_challenges_email_created ON login_challenges(normalized_email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_challenges_ip_created ON login_challenges(request_ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token ON portal_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_user ON portal_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_group_memberships_import ON group_memberships(last_import_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(workflow_status, created_at);
CREATE INDEX IF NOT EXISTS idx_access_events_user_time ON access_events(user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_announcements_status_date ON announcements(status, published_at, original_published_at);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_announcement_email_deliveries_announcement ON announcement_email_deliveries(announcement_id, created_at);
CREATE INDEX IF NOT EXISTS idx_qa_questions_public ON qa_questions(status, published_at, created_at);
CREATE INDEX IF NOT EXISTS idx_qa_questions_user ON qa_questions(submitted_by_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_qa_answers_question ON qa_answers(question_id, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_qa_attachments_question ON qa_attachments(question_id, created_at);
CREATE INDEX IF NOT EXISTS idx_qa_attachments_answer ON qa_attachments(answer_id, created_at);
