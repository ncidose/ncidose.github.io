// Run offline with the pinned Mac runtime:
// ./scripts/macos-node.sh node --test scripts/portal/secondary-email.test.mjs
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "./worker.js";

const origin = "https://portal.ncidosetools.com";
const secret = "offline-test-secret";
const hash = (value) => createHmac("sha256", secret).update(value).digest("base64url");

function fixture(t) {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  t.after(() => db.close());
  for (const [id, role] of [["admin", "admin"], ["member", "user"], ["other", "user"]]) {
    db.prepare("INSERT INTO users (id, display_name, role) VALUES (?, ?, ?)").run(id, id, role);
    db.prepare("INSERT INTO user_identities (id,user_id,provider,normalized_email,is_primary,email_verified) VALUES (?,?,'test',?,1,1)")
      .run(id, id, `${id}@example.org`);
  }
  db.exec("INSERT INTO user_identities (id,user_id,provider,provider_subject,normalized_email,email_verified) VALUES ('secondary','member','test','old-provider','old@example.org',1)");
  for (const id of ["admin", "member", "secondary"]) {
    db.prepare("INSERT INTO portal_sessions (id,user_id,identity_id,token_hash,expires_at) VALUES (?,?,?,?,datetime('now','+1 day'))")
      .run(id, id === "secondary" ? "member" : id, id, hash(`session:${id}-token`));
  }
  const addChallenge = (id, email) => db.prepare("INSERT INTO login_challenges (id,normalized_email,user_id,identity_id,code_hash,request_ip_hash,expires_at) VALUES (?,?,'member','secondary',?,'test',datetime('now','+10 minutes'))")
    .run(id, email, hash(`code:${id}:${email}:123456`));
  addChallenge("old-code", "old@example.org");
  const adapter = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() { return db.prepare(sql).get(...values) || null; },
        async all() { return { results: db.prepare(sql).all(...values) }; },
        async run() { return db.prepare(sql).run(...values); },
      };
    },
    async batch(statements) {
      db.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        db.exec("COMMIT");
        return results;
      } catch (error) { db.exec("ROLLBACK"); throw error; }
    },
  };
  const env = { ENVIRONMENT: "production", AUTH_SECRET: secret, DB: adapter,
    RESEND_API_KEY: "offline-test-key", RESEND_SEGMENT_ID: "offline-segment", RESEND_FROM: "portal@example.org" };
  const outgoing = t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "https://api.resend.com/emails");
    return Response.json({ id: "offline-message" });
  });
  async function request(path, body, token = "admin-token", requestOrigin = origin) {
    const pending = [];
    const response = await worker.fetch(new Request(`${origin}${path}`, {
      method: body ? path.includes("verify-code") ? "POST" : "PATCH" : "GET",
      headers: { origin: requestOrigin, "content-type": "application/json", cookie: `__Host-ncidose_session=${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), env, { waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending);
    return { status: response.status, body: await response.json() };
  }
  const patch = (body, token, requestOrigin) => request("/api/admin/users/member", body, token, requestOrigin);
  return { db, adapter, env, outgoing, addChallenge, request, patch };
}

test("replacement invalidates old access and requires verification without changing primary access", async (t) => {
  const f = fixture(t);
  const result = await f.patch({ secondaryEmail: " New@Example.org " });
  assert.equal(result.status, 200);
  assert.equal(result.body.welcomeEmail.status, "sent", JSON.stringify(result.body.welcomeEmail));
  assert.equal(result.body.identityAction, "replaced");
  assert.equal(result.body.identity.id, "secondary");
  assert.equal(result.body.identity.verified, false);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM user_identities WHERE user_id='member'").get().n, 2);
  assert.equal(f.db.prepare("SELECT provider_subject FROM user_identities WHERE id='secondary'").get().provider_subject, null);
  assert.equal((await f.request("/api/me", null, "secondary-token")).status, 401);
  assert.equal((await f.request("/api/me", null, "member-token")).status, 200);
  assert.equal((await f.request("/api/auth/verify-code", { challengeId: "old-code", code: "123456" })).status, 410);
  f.addChallenge("new-code", "new@example.org");
  const verified = await f.request("/api/auth/verify-code", { challengeId: "new-code", code: "123456" });
  assert.equal(verified.status, 200);
  assert.equal(f.db.prepare("SELECT email_verified FROM user_identities WHERE id='secondary'").get().email_verified, 1);
  assert.equal(f.outgoing.mock.callCount(), 1);
  assert.deepEqual(JSON.parse(f.outgoing.mock.calls[0].arguments[1].body).to, ["new@example.org"]);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM access_events WHERE event_type='email_replaced'").get().n, 1);
});

test("unchanged secondary email neither resets verification nor sends another welcome", async (t) => {
  const f = fixture(t);
  const result = await f.patch({ secondaryEmail: "OLD@example.org" });
  assert.equal(result.status, 200);
  assert.equal(result.body.identity, null);
  assert.equal(f.db.prepare("SELECT email_verified FROM user_identities WHERE id='secondary'").get().email_verified, 1);
  assert.equal(f.db.prepare("SELECT revoked_at FROM portal_sessions WHERE id='secondary'").get().revoked_at, null);
  assert.equal(f.outgoing.mock.callCount(), 0);
});

for (const [email, error] of [["other@example.org", "email_in_use"], ["member@example.org", "email_already_linked"]]) {
  test(`rejects ${error} without changing the account`, async (t) => {
    const f = fixture(t);
    const result = await f.patch({ secondaryEmail: email });
    assert.equal(result.status, 409);
    assert.equal(result.body.error, error);
    assert.equal(f.db.prepare("SELECT normalized_email FROM user_identities WHERE id='secondary'").get().normalized_email, "old@example.org");
    assert.equal(f.outgoing.mock.callCount(), 0);
  });
}

test("requires administrator permission and a matching request origin", async (t) => {
  const f = fixture(t);
  assert.equal((await f.patch({ secondaryEmail: "new@example.org" }, "member-token")).status, 403);
  assert.equal((await f.patch({ secondaryEmail: "new@example.org" }, "admin-token", "https://unrelated.example")).status, 403);
  assert.equal(f.outgoing.mock.callCount(), 0);
});

test("a conflicting concurrent insert rolls back revocation and identity changes", async (t) => {
  const f = fixture(t);
  const batch = f.adapter.batch.bind(f.adapter);
  f.adapter.batch = async (statements) => {
    f.db.exec("INSERT INTO user_identities (id,user_id,provider,normalized_email) VALUES ('conflict','other','test','new@example.org')");
    return batch(statements);
  };
  assert.equal((await f.patch({ secondaryEmail: "new@example.org" })).status, 409);
  assert.equal(f.db.prepare("SELECT normalized_email FROM user_identities WHERE id='secondary'").get().normalized_email, "old@example.org");
  assert.equal(f.db.prepare("SELECT revoked_at FROM portal_sessions WHERE id='secondary'").get().revoked_at, null);
  assert.equal(f.db.prepare("SELECT consumed_at FROM login_challenges WHERE id='old-code'").get().consumed_at, null);
  assert.equal(f.outgoing.mock.callCount(), 0);
});

test("mail provider failure reports the failure while preserving the completed replacement", async (t) => {
  const f = fixture(t);
  f.outgoing.mock.mockImplementation(async () => Response.json({ message: "offline provider failure" }, { status: 500 }));
  const result = await f.patch({ secondaryEmail: "new@example.org" });
  assert.equal(result.status, 200);
  assert.equal(result.body.welcomeEmail.status, "failed");
  assert.equal(f.db.prepare("SELECT normalized_email FROM user_identities WHERE id='secondary'").get().normalized_email, "new@example.org");
});
