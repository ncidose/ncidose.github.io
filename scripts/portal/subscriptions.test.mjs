// Offline integration tests: real SQLite, mocked Resend, no outgoing mail.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "./worker.js";
import { drainSubscriberMail, queueScientificUpdate } from "./subscriptions.js";

const origin = "https://portal.ncidosetools.com";
const publicOrigin = "https://ncidose.github.io";
const secret = "offline-subscription-test";
const hash = (value) => createHmac("sha256", secret).update(value).digest("base64url");

function fixture(t) {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  t.after(() => db.close());
  for (const role of ["admin", "user"]) {
    db.prepare("INSERT INTO users (id,role) VALUES (?,?)").run(role, role);
    db.prepare("INSERT INTO user_identities (id,user_id,provider,normalized_email,is_primary,email_verified) VALUES (?,?,'test',?,1,1)").run(role, role, `${role}@example.org`);
    db.prepare("INSERT INTO portal_sessions (id,user_id,identity_id,token_hash,expires_at) VALUES (?,?,?,?,datetime('now','+1 day'))").run(role, role, role, hash(`session:${role}`));
  }
  const adapter = {
    prepare(sql) {
      let values = [];
      return { bind(...args) { values = args; return this; },
        async first() { return db.prepare(sql).get(...values) || null; },
        async all() { return { results: db.prepare(sql).all(...values) }; },
        async run() { return db.prepare(sql).run(...values); } };
    },
    async batch(statements) {
      db.exec("BEGIN");
      try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec("COMMIT"); return results; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    },
  };
  const env = { DB: adapter, AUTH_SECRET: secret, RESEND_API_KEY: "test-key", RESEND_FROM: "updates@example.org", RESEND_SEGMENT_ID: "test-segment", ALLOWED_ORIGINS: `${publicOrigin},${origin}` };
  const messages = [];
  let failEmail = false;
  const outgoing = t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.includes("/segments/")) return Response.json({ data: ["admin", "user"].map((name) => ({ id: name, email: `${name}@example.org`, unsubscribed: false })) });
    if (url.endsWith("/broadcasts")) return Response.json({ id: "test-broadcast" });
    assert.equal(url, "https://api.resend.com/emails");
    messages.push({ ...JSON.parse(options.body), key: options.headers["Idempotency-Key"] });
    return failEmail ? Response.json({ error: "temporary" }, { status: 503 }) : Response.json({ id: `mail-${messages.length}` });
  });
  async function request(path, { method = "GET", body, role, requestOrigin = publicOrigin } = {}) {
    const pending = [];
    const response = await worker.fetch(new Request(new URL(path, origin), {
      method, headers: { origin: requestOrigin, "cf-connecting-ip": "192.0.2.1", "content-type": "application/json", ...(role ? { cookie: `__Host-ncidose_session=${role}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }), env, { waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending);
    return response;
  }
  const subscribe = (email = "reader@example.org", source = "homepage") => request("/api/public/subscriptions", { method: "POST", body: { email, source, consent: true } });
  const confirmUrl = (message = messages.at(-1)) => message.text.match(/Confirm subscription: (https:\/\/[^\s]+)/)[1];
  async function activate(email = "reader@example.org", source = "homepage") {
    assert.equal((await subscribe(email, source)).status, 202);
    const link = confirmUrl();
    assert.equal((await request(link, { method: "POST" })).status, 200);
    return link;
  }
  const publish = (body) => request("/api/admin/announcements", { method: "POST", role: "admin", requestOrigin: origin, body: { title: "New scientific model", body: "Scientific data and dosimetry model improvements.", category: "Release", scientificUpdate: true, status: "published", sendSubscriberEmail: true, ...body } });
  return { db, env, outgoing, messages, request, subscribe, confirmUrl, activate, publish, setFailure: (value) => { failEmail = value; } };
}

test("migration upgrades an existing database without granting subscribers portal access", () => {
  const db = new DatabaseSync(":memory:");
  try {
    const current = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
    const previous = current.split("CREATE TABLE public_subscribers")[0]
      .replace("  scientific_update INTEGER NOT NULL DEFAULT 0 CHECK (scientific_update IN (0, 1)),\n", "")
      .replace("  recipient_emails_json TEXT,\n", "");
    db.exec(previous);
    db.exec("INSERT INTO users (id) VALUES ('existing')");
    db.exec(readFileSync(new URL("./migrations/0018_add_scientific_subscribers.sql", import.meta.url), "utf8"));
    assert.equal(db.prepare("SELECT count(*) AS n FROM users").get().n, 1);
    assert.equal(db.prepare("SELECT count(*) AS n FROM public_subscribers").get().n, 0);
  } finally { db.close(); }
});

for (const source of ["homepage", "sta", "vendor"]) {
  test(`${source} signup requires confirmation, sends welcome once, and grants no access`, async (t) => {
    const f = fixture(t);
    assert.equal((await f.subscribe(" Reader@Example.org ", source)).status, 202);
    assert.equal(f.messages.length, 1);
    assert.deepEqual(f.messages[0].to, ["reader@example.org"]);
    const link = f.confirmUrl();
    assert.equal((await f.request(link)).status, 200);
    assert.equal(f.db.prepare("SELECT status FROM public_subscribers").get().status, "pending", "email scanners must not confirm a subscription");
    assert.equal((await f.request(link, { method: "POST" })).status, 200);
    assert.equal(f.messages.length, 2);
    assert.match(f.messages[1].subject, /Welcome/);
    assert.match(f.messages[1].text, /Maintenance updates are excluded/);
    assert.doesNotMatch(f.messages[1].html, /approved.*account|Open.*User Portal/);
    assert.equal(f.db.prepare("SELECT source FROM public_subscribers").get().source, source);
    assert.equal((await f.request(link, { method: "POST" })).status, 200);
    await f.subscribe();
    assert.equal(f.messages.length, 2, "repeat confirmations and signups must not resend welcome");
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM users").get().n, 2);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM user_identities").get().n, 2);
    assert.equal((await f.request("/api/me")).status, 401);
  });
}

test("invalid origins, malformed addresses, missing consent, and request flooding send no mail", async (t) => {
  const f = fixture(t);
  assert.equal((await f.request("/api/public/subscriptions", { method: "POST", requestOrigin: "https://evil.example", body: { email: "reader@example.org", consent: true } })).status, 403);
  for (const body of [{ email: "invalid", consent: true }, { email: "reader@example.org" }, null]) {
    assert.equal((await f.request("/api/public/subscriptions", { method: "POST", body })).status, 400);
  }
  await f.request("/api/public/subscriptions", { method: "POST", body: { email: "bot@example.org", consent: true, website: "spam" } });
  assert.equal(f.messages.length, 0);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM public_subscribers").get().n, 0);
  for (let i = 0; i < 5; i += 1) assert.equal((await f.subscribe()).status, 202);
  assert.equal((await f.subscribe()).status, 429);
  assert.equal(f.messages.length, 1);
});

test("tampered and expired links cannot confirm; unsubscribe works without a portal account", async (t) => {
  const f = fixture(t);
  await f.subscribe();
  const link = f.confirmUrl();
  assert.equal((await f.request(`${link.slice(0, -1)}!`, { method: "POST" })).status, 400);
  f.db.exec("UPDATE public_subscribers SET confirmation_expires_at=datetime('now','-1 minute')");
  assert.equal((await f.request(link, { method: "POST" })).status, 410);
  f.db.exec("UPDATE public_subscribers SET confirmation_expires_at=datetime('now','+1 day')");
  await f.request(link, { method: "POST" });
  const unsubscribe = f.messages.at(-1).text.match(/Unsubscribe: (https:\/\/[^\s]+)/)[1];
  await f.request(unsubscribe);
  assert.equal(f.db.prepare("SELECT status FROM public_subscribers").get().status, "active");
  await f.request(unsubscribe, { method: "POST", requestOrigin: "" });
  assert.equal(f.db.prepare("SELECT status FROM public_subscribers").get().status, "unsubscribed");
  assert.equal((await f.request(link, { method: "POST" })).status, 410);
  f.db.exec("UPDATE public_subscribers SET updated_at=datetime('now','-3 minutes')");
  await f.subscribe();
  assert.notEqual(f.confirmUrl(), link);
  assert.equal(f.db.prepare("SELECT status FROM public_subscribers").get().status, "pending");
  assert.equal((await f.request(link, { method: "POST" })).status, 400);
});

test("only admins can list or unsubscribe; they cannot bypass email confirmation", async (t) => {
  const f = fixture(t);
  await f.activate();
  const id = f.db.prepare("SELECT id FROM public_subscribers").get().id;
  assert.equal((await f.request("/api/admin/subscribers")).status, 401);
  assert.equal((await f.request("/api/admin/subscribers", { role: "user" })).status, 403);
  const result = await (await f.request("/api/admin/subscribers?q=reader&status=active", { role: "admin" })).json();
  assert.equal(result.total, 1);
  assert.equal(result.counts.active, 1);
  assert.equal(result.subscribers[0].confirmation_nonce, undefined);
  assert.equal((await f.request(`/api/admin/subscribers/${id}`, { method: "PATCH", role: "admin", body: { status: "unsubscribed" }, requestOrigin: publicOrigin })).status, 403);
  assert.equal((await f.request(`/api/admin/subscribers/${id}`, { method: "PATCH", role: "admin", body: { status: "active" }, requestOrigin: origin })).status, 400);
  assert.equal((await f.request(`/api/admin/subscribers/${id}`, { method: "PATCH", role: "admin", body: { status: "unsubscribed" }, requestOrigin: origin })).status, 200);
  assert.equal(f.db.prepare("SELECT status FROM public_subscribers").get().status, "unsubscribed");
});

test("maintenance, access, generic releases, drafts, and historical imports cannot email public subscribers", async (t) => {
  const f = fixture(t);
  await f.activate();
  const count = f.messages.length;
  for (const body of [{ category: "Maintenance" }, { category: "Access" }, { scientificUpdate: false }, { status: "draft" }, { originalPublishedAt: "2020-01-01" }, { sourceUrl: "https://groups.google.com/g/ncidose/example" }]) {
    const response = await f.publish(body);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "scientific_update_required");
  }
  assert.equal(f.messages.length, count);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM subscriber_campaigns").get().n, 0);
});

test("scientific publication emails confirmed subscribers once and preserves the original content", async (t) => {
  const f = fixture(t);
  await f.activate();
  await f.subscribe("pending@example.org");
  const response = await f.publish();
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.deepEqual(result.subscriberDelivery, { status: "queued", recipientCount: 1 });
  const sent = f.messages.filter((message) => message.subject === "New scientific model");
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["reader@example.org"]);
  assert.match(sent[0].headers["List-Unsubscribe"], /subscriptions\/unsubscribe/);
  assert.equal(sent[0].headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  const announcement = f.db.prepare("SELECT * FROM announcements WHERE id=?").get(result.announcement.id);
  await queueScientificUpdate(f.env, { ...announcement, body: "Edited after publication" });
  await drainSubscriberMail(f.env);
  assert.equal(f.messages.filter((message) => message.subject === "New scientific model").length, 1);
  assert.equal(f.db.prepare("SELECT body FROM subscriber_campaigns").get().body, announcement.body);
});

test("combined scientific and approved-user delivery excludes overlapping email addresses", async (t) => {
  const f = fixture(t);
  await f.activate("user@example.org");
  await f.activate("reader@example.org");
  const response = await f.publish({ sendEmail: true });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.emailDelivery.status, "sent");
  assert.equal(result.subscriberDelivery.recipientCount, 1);
  assert.deepEqual(f.messages.filter((message) => message.subject === "New scientific model").map((message) => message.to), [["reader@example.org"]]);
});

test("mail retries retain the same content and idempotency key, and unsubscribe cancels queued mail", async (t) => {
  const f = fixture(t);
  await f.activate();
  f.setFailure(true);
  const result = await (await f.publish()).json();
  const first = f.messages.at(-1);
  assert.equal(f.db.prepare("SELECT status FROM subscriber_mail_jobs WHERE kind='scientific'").get().status, "queued");
  f.db.exec("UPDATE subscriber_mail_jobs SET next_attempt_at=datetime('now','-1 minute') WHERE kind='scientific'");
  f.db.prepare("UPDATE announcements SET body='Changed' WHERE id=?").run(result.announcement.id);
  f.setFailure(false);
  await drainSubscriberMail(f.env);
  assert.deepEqual(f.messages.at(-1), first);
  assert.equal(f.db.prepare("SELECT status FROM subscriber_mail_jobs WHERE kind='scientific'").get().status, "sent");
  f.setFailure(true);
  await f.publish({ title: "Another scientific update" });
  const unsubscribe = f.messages.at(-1).text.match(/Unsubscribe: (https:\/\/[^\s]+)/)[1];
  await f.request(unsubscribe, { method: "POST" });
  f.setFailure(false);
  const count = f.messages.length;
  f.db.exec("UPDATE subscriber_mail_jobs SET next_attempt_at=datetime('now','-1 minute')");
  await drainSubscriberMail(f.env);
  assert.equal(f.messages.length, count);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM subscriber_mail_jobs WHERE status='cancelled'").get().n, 1);
});
