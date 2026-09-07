CREATE INDEX IF NOT EXISTS idx_user_identities_user_primary
  ON user_identities(user_id, is_primary DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_access_events_type_time
  ON access_events(event_type, occurred_at DESC);
