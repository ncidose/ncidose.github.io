ALTER TABLE announcements ADD COLUMN scientific_update INTEGER NOT NULL DEFAULT 0 CHECK (scientific_update IN (0, 1));
ALTER TABLE announcement_email_deliveries ADD COLUMN recipient_emails_json TEXT;

CREATE TABLE public_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'unsubscribed')),
  source TEXT NOT NULL CHECK (source IN ('homepage', 'sta', 'vendor')),
  confirmation_nonce TEXT NOT NULL,
  confirmation_expires_at TEXT NOT NULL,
  confirmed_at TEXT,
  unsubscribed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE subscription_requests (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_subscription_requests_ip ON subscription_requests(ip_hash, created_at);
CREATE INDEX idx_subscription_requests_email ON subscription_requests(email_hash, created_at);
CREATE INDEX idx_subscription_requests_time ON subscription_requests(created_at);
CREATE INDEX idx_public_subscribers_status ON public_subscribers(status, created_at);

CREATE TABLE subscriber_campaigns (
  announcement_id TEXT PRIMARY KEY REFERENCES announcements(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  enqueued INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE subscriber_mail_jobs (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL REFERENCES public_subscribers(id),
  kind TEXT NOT NULL CHECK (kind IN ('confirmation', 'welcome', 'scientific')),
  announcement_id TEXT REFERENCES subscriber_campaigns(announcement_id),
  confirmation_nonce TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  payload_json TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at TEXT,
  next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lease_until TEXT,
  provider_email_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT
);
CREATE INDEX idx_subscriber_mail_queue ON subscriber_mail_jobs(status, next_attempt_at);
CREATE INDEX idx_subscriber_mail_subscriber ON subscriber_mail_jobs(subscriber_id, created_at);
CREATE INDEX idx_subscriber_mail_campaign ON subscriber_mail_jobs(announcement_id, status);
