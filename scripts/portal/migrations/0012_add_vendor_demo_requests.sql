CREATE TABLE IF NOT EXISTS vendor_demo_requests (
  id TEXT PRIMARY KEY,
  request_ip_hash TEXT NOT NULL,
  tool TEXT NOT NULL CHECK (tool IN ('ncict', 'ncinm', 'ncirf')),
  preset_id TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT 'started' CHECK (result IN ('started', 'succeeded', 'failed')),
  upstream_status INTEGER,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_vendor_demo_ip_time ON vendor_demo_requests(request_ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_vendor_demo_tool_time ON vendor_demo_requests(tool, created_at);
CREATE INDEX IF NOT EXISTS idx_vendor_demo_result_time ON vendor_demo_requests(result, created_at);
