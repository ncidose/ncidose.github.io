// Offline SQLite integration checks: ./scripts/macos-node.sh node --test scripts/portal/sandbox-activity.test.mjs
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "./worker.js";

function fixture(t) {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  t.after(() => db.close());
  const secret = "offline-sandbox-test";
  const tokenHash = createHmac("sha256", secret).update("session:admin-token").digest("base64url");
  db.exec("INSERT INTO users (id, display_name, role) VALUES ('admin', 'Admin', 'admin')");
  db.exec("INSERT INTO user_identities (id,user_id,provider,normalized_email,is_primary,email_verified) VALUES ('admin','admin','test','admin@example.org',1,1)");
  db.prepare("INSERT INTO portal_sessions (id,user_id,identity_id,token_hash,expires_at) VALUES ('admin','admin','admin',?,datetime('now','+1 day'))").run(tokenHash);
  const env = {
    ENVIRONMENT: "production", AUTH_SECRET: secret,
    ALLOWED_ORIGINS: "https://ncidose.github.io",
    NCIDOSE_VENDOR_DEMO_API_KEY: "offline-cpu-key",
    NCIDOSE_VENDOR_GPU_DEMO_API_KEY: "offline-gpu-key",
    DB: { prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() { return db.prepare(sql).get(...values) || null; },
        async all() { return { results: db.prepare(sql).all(...values) }; },
        async run() { return db.prepare(sql).run(...values); },
      };
    } },
  };
  t.mock.method(globalThis, "fetch", () => { throw new Error("Offline test must not call an upstream service"); });
  const add = (id, preset, overrides = {}) => {
    const row = { id, request_ip_hash: "client-a", tool: "ncirf", preset_id: preset,
      result: "succeeded", duration_ms: 4000, country_code: "US", city: "Denver",
      counts_toward_limit: 1, attempt_count: 1, ...overrides };
    db.prepare(`INSERT INTO vendor_demo_requests (${Object.keys(row).join(",")}) VALUES (${Object.keys(row).map(() => "?").join(",")})`).run(...Object.values(row));
  };
  const request = (path, init = {}) => worker.fetch(new Request(`https://portal.ncidosetools.com${path}`, {
    ...init, headers: { origin: "https://ncidose.github.io", cookie: "__Host-ncidose_session=admin-token",
      "content-type": "application/json", "cf-connecting-ip": "192.0.2.1" },
  }), env, { waitUntil() {} });
  return { db, add, request };
}

test("admin totals and failures separate legacy CPU runs from GPU runs without changing reporting exclusions", async (t) => {
  const { add, request } = fixture(t);
  add("cpu-ok", "ncirf-size-demo", { duration_ms: 33000 });
  add("cpu-failed", "ncirf-size-demo", { result: "failed", duration_ms: 500, upstream_status: 503 });
  add("gpu-ok", "ncirf-gpu-size-demo");
  add("gpu-failed", "ncirf-gpu-size-demo", { result: "failed", duration_ms: 200, upstream_status: 400 });
  add("gpu-limited", "ncirf-gpu-size-demo", { result: "failed", counts_toward_limit: 0, failure_reason: "rate_limited", attempt_count: 3 });
  add("cpu-busy", "ncirf-size-demo", { result: "failed", counts_toward_limit: 0, failure_reason: "busy", attempt_count: 2 });
  add("ct-ok", "ncict-adult-chest", { tool: "ncict", duration_ms: 500 });
  add("excluded-gpu", "ncirf-gpu-size-demo", { city: "Rockville" });
  add("expired-cpu", "ncirf-size-demo", { created_at: "2020-01-01 00:00:00" });
  const response = await request("/api/admin/activity");
  assert.equal(response.status, 200);
  const { sandbox } = await response.json();
  const cpu = sandbox.tools.find((row) => row.tool === "ncirf");
  const gpu = sandbox.tools.find((row) => row.tool === "ncirfgpu");
  assert.deepEqual(cpu, { tool: "ncirf", requests: 2, uniqueClients: 1, succeeded: 1,
    failed: 1, rateLimited: 0, busy: 2, successRate: 50, averageDurationMs: 33000 });
  assert.deepEqual(gpu, { tool: "ncirfgpu", requests: 2, uniqueClients: 1, succeeded: 1,
    failed: 1, rateLimited: 3, busy: 0, successRate: 50, averageDurationMs: 4000 });
  assert.equal(sandbox.summary.requests30Days, 5);
  assert.equal(sandbox.tools.reduce((sum, row) => sum + row.requests, 0), sandbox.summary.requests30Days);
  assert.equal(sandbox.recentFailures.find((row) => row.id === "cpu-failed").tool, "ncirf");
  assert.equal(sandbox.recentFailures.find((row) => row.id === "gpu-failed").tool, "ncirfgpu");
});

for (const reason of ["busy", "rate_limited"]) {
  test(`${reason} attempts from one client stay separate for CPU and GPU in the same time bucket`, async (t) => {
    const { db, add, request } = fixture(t);
    t.mock.method(Date, "now", () => 1800000000000);
    for (const preset of ["ncirf-size-demo", "ncirf-gpu-size-demo"]) {
      const count = reason === "busy" ? 3 : 5;
      const secret = "offline-sandbox-test";
      const clientHash = createHmac("sha256", secret).update("vendor-demo-ip:192.0.2.1").digest("base64url");
      for (let i = 0; i < count; i++) {
        add(`${preset}-${i}`, preset, { result: reason === "busy" ? "started" : "succeeded",
          request_ip_hash: reason === "busy" ? `other-${i}` : clientHash });
      }
    }
    for (const presetId of ["ncirf-size-demo", "ncirf-gpu-size-demo", "ncirf-size-demo"]) {
      const response = await request("/api/public/vendor-demo", { method: "POST", body: JSON.stringify({ presetId }) });
      assert.equal(response.status, 429);
      assert.equal((await response.json()).error, reason === "busy" ? "demo_busy" : "too_many_demo_requests");
    }
    const rows = db.prepare("SELECT preset_id, attempt_count FROM vendor_demo_requests WHERE counts_toward_limit=0 ORDER BY preset_id").all();
    assert.deepEqual(rows.map((row) => ({ ...row })), [
      { preset_id: "ncirf-gpu-size-demo", attempt_count: 1 },
      { preset_id: "ncirf-size-demo", attempt_count: 2 },
    ]);
  });
}
