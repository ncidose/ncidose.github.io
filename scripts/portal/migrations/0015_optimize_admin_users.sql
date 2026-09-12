CREATE INDEX IF NOT EXISTS idx_portal_sessions_user_created
  ON portal_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_events_type_user_time
  ON access_events(event_type, user_id, occurred_at DESC);
