ALTER TABLE vendor_demo_requests ADD COLUMN country_code TEXT;
ALTER TABLE vendor_demo_requests ADD COLUMN city TEXT;
ALTER TABLE vendor_demo_requests ADD COLUMN counts_toward_limit INTEGER NOT NULL DEFAULT 1;
ALTER TABLE vendor_demo_requests ADD COLUMN failure_reason TEXT;
ALTER TABLE vendor_demo_requests ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_vendor_demo_location_time
  ON vendor_demo_requests(country_code, city, created_at);
CREATE INDEX IF NOT EXISTS idx_vendor_demo_failure_time
  ON vendor_demo_requests(failure_reason, created_at);
