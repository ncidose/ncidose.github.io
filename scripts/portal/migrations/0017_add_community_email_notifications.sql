ALTER TABLE users
  ADD COLUMN community_email_notifications INTEGER NOT NULL DEFAULT 1
  CHECK (community_email_notifications IN (0, 1));

ALTER TABLE users
  ADD COLUMN announcement_email_notifications INTEGER NOT NULL DEFAULT 1
  CHECK (announcement_email_notifications IN (0, 1));
