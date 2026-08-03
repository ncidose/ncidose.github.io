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

CREATE INDEX IF NOT EXISTS idx_login_challenges_email_created
  ON login_challenges(normalized_email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_challenges_ip_created
  ON login_challenges(request_ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token
  ON portal_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_user
  ON portal_sessions(user_id, expires_at);
