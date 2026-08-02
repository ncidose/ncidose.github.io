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

CREATE INDEX IF NOT EXISTS idx_announcement_email_deliveries_announcement
  ON announcement_email_deliveries(announcement_id, created_at);
