PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  institution TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  sta_status TEXT NOT NULL DEFAULT 'approved',
  access_status TEXT NOT NULL DEFAULT 'active' CHECK (access_status IN ('pending', 'active', 'suspended')),
  approval_source TEXT NOT NULL DEFAULT 'google_group',
  approved_at TEXT,
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

CREATE INDEX IF NOT EXISTS idx_user_identities_email ON user_identities(normalized_email);
CREATE INDEX IF NOT EXISTS idx_group_memberships_import ON group_memberships(last_import_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(workflow_status, created_at);
CREATE INDEX IF NOT EXISTS idx_access_events_user_time ON access_events(user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_announcements_status_date ON announcements(status, published_at, original_published_at);
