// Public subscriptions never create users, identities, or download permissions.
const portalOrigin = "https://portal.ncidosetools.com";
const website = "https://ncidose.github.io";
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { ...headers, "cache-control": "no-store" } });
const configured = (env) => Boolean(env.DB && env.AUTH_SECRET && env.RESEND_API_KEY && env.RESEND_FROM);
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function sign(env, value) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.AUTH_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...signature)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function actionUrl(env, subscriber, action) {
  const value = action === "confirm" ? `${subscriber.id}:${subscriber.confirmation_nonce}` : subscriber.id;
  const token = await sign(env, `public-subscription:${action}:${value}`);
  return `${portalOrigin}/api/public/subscriptions/${action}?id=${subscriber.id}&token=${token}`;
}

function actionPage(title, message, action = null, status = 200) {
  const form = action ? `<form method="post"><button type="submit">${escapeHtml(action)}</button></form>` : "";
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | NCI Dose Tools</title><style>body{margin:0;background:#edf3f7;color:#172b3a;font:16px/1.65 Arial,sans-serif}main{max-width:560px;margin:10vh auto;padding:36px;background:white;border-top:5px solid #168aca}h1{font-size:28px;line-height:1.2}button{border:0;background:#126b9a;color:white;padding:14px 24px;font:inherit;cursor:pointer}a{color:#126b9a}@media(max-width:600px){main{margin:24px;padding:24px}}</style></head><body><main><a href="${website}">NCI Dose Tools</a><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${form}<p><a href="${website}/#stay-updated">Return to NCI Dose Tools</a></p></main></body></html>`, {
    status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" },
  });
}

export function scientificEmailHtml({ title, body, actionLabel = "View scientific updates", actionHref = `${website}/manuals#release-history`, unsubscribeUrl }) {
  const paragraphs = body.split(/\n{2,}/).map((paragraph) => `<p style="margin:0 0 18px;line-height:1.65">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`).join("");
  return `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#edf3f7;font-family:Arial,sans-serif;color:#172b3a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:white;border:1px solid #c9d7e2"><tr><td style="padding:28px 32px;background:#123f63;color:white;border-bottom:5px solid #168aca"><div style="font-size:24px">NCI Dose Tools</div><div style="margin-top:8px;font-size:12px;letter-spacing:2px">SCIENTIFIC UPDATES</div></td></tr><tr><td style="padding:32px"><h1 style="font-size:28px;line-height:1.2">${escapeHtml(title)}</h1>${paragraphs}<p style="margin:28px 0"><a href="${escapeHtml(actionHref)}" style="display:inline-block;background:#126b9a;color:white;padding:13px 22px;text-decoration:none">${escapeHtml(actionLabel)}</a></p><p>Sincerely,<br><strong>NCI Dose Team</strong><br>National Cancer Institute</p></td></tr><tr><td style="padding:22px 32px;background:#f4f7f9;font-size:12px;color:#607486">Scientific updates to NCI Dose Tools. ${unsubscribeUrl ? `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#126b9a">Unsubscribe</a>` : ""}</td></tr></table></td></tr></table></body></html>`;
}

async function unsubscribe(env, id) {
  await env.DB.batch([
    env.DB.prepare("UPDATE public_subscribers SET status='unsubscribed', unsubscribed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id),
    env.DB.prepare("UPDATE subscriber_mail_jobs SET status='cancelled' WHERE subscriber_id=? AND status IN ('queued','sending')").bind(id),
  ]);
}

async function subscribe(request, env, cors, context) {
  const origin = request.headers.get("origin");
  if (!origin || !(env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).includes(origin)) return json({ error: "invalid_origin" }, 403, cors);
  if (!configured(env)) return json({ error: "subscriptions_unavailable" }, 503, cors);
  const raw = await request.text();
  if (raw.length > 2048) return json({ error: "invalid_request" }, 400, cors);
  let input;
  try { input = JSON.parse(raw); } catch { return json({ error: "invalid_request" }, 400, cors); }
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || input.consent !== true) return json({ error: "email_and_consent_required" }, 400, cors);
  const accepted = () => json({ ok: true, message: "Check your inbox to confirm your subscription. If you already subscribe, you are all set." }, 202, cors);
  if (input.website) return accepted(); // Honeypot: no email or subscriber record.
  const ipHash = await sign(env, `subscription-ip:${request.headers.get("cf-connecting-ip") || "unknown"}`);
  const emailHash = await sign(env, `subscription-email:${email}`);
  const allowed = await env.DB.prepare(`INSERT INTO subscription_requests (id, ip_hash, email_hash)
    SELECT ?, ?, ? WHERE
      (SELECT COUNT(*) FROM subscription_requests WHERE ip_hash=? AND created_at>=datetime('now','-1 hour')) < 10
      AND (SELECT COUNT(*) FROM subscription_requests WHERE email_hash=? AND created_at>=datetime('now','-1 day')) < 5
      AND (SELECT COUNT(*) FROM subscription_requests WHERE created_at>=datetime('now','-1 hour')) < 100
    RETURNING id`).bind(crypto.randomUUID(), ipHash, emailHash, ipHash, emailHash).first();
  if (!allowed) return json({ error: "rate_limited" }, 429, { ...cors, "retry-after": "3600" });
  const id = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const subscriber = await env.DB.prepare(`INSERT INTO public_subscribers (id,email,source,confirmation_nonce,confirmation_expires_at)
    VALUES (?,?,?,?,datetime('now','+1 day'))
    ON CONFLICT(email) DO UPDATE SET status='pending', source=excluded.source, confirmation_nonce=excluded.confirmation_nonce,
      confirmation_expires_at=excluded.confirmation_expires_at, updated_at=CURRENT_TIMESTAMP
    WHERE public_subscribers.status!='active' AND public_subscribers.updated_at<datetime('now','-2 minutes')
    RETURNING *`).bind(id, email, ["sta", "vendor"].includes(input.source) ? input.source : "homepage", nonce).first();
  if (subscriber) {
    const jobId = `confirmation:${subscriber.id}:${subscriber.confirmation_nonce}`;
    await env.DB.prepare("INSERT OR IGNORE INTO subscriber_mail_jobs (id,subscriber_id,kind,confirmation_nonce) VALUES (?,?,'confirmation',?)").bind(jobId, subscriber.id, subscriber.confirmation_nonce).run();
    context.waitUntil(drainSubscriberMail(env, { jobId, limit: 1 }));
  }
  return accepted();
}

async function subscriptionAction(request, env, action) {
  if (!configured(env)) return actionPage("Temporarily unavailable", "Please try again shortly.", null, 503);
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const token = url.searchParams.get("token") || "";
  if (id.length > 64 || token.length !== 43) return actionPage("Invalid link", "Please request a new subscription email.", null, 400);
  const subscriber = await env.DB.prepare("SELECT * FROM public_subscribers WHERE id=?").bind(id).first();
  const expected = subscriber ? new URL(await actionUrl(env, subscriber, action)).searchParams.get("token") : "";
  let difference = expected.length ^ token.length;
  for (let i = 0; i < token.length; i += 1) difference |= token.charCodeAt(i) ^ (expected.charCodeAt(i) || 0);
  if (!subscriber || difference) return actionPage("Invalid link", "Please request a new subscription email.", null, 400);
  if (action === "unsubscribe") {
    if (request.method === "GET") return actionPage("Unsubscribe from scientific updates", "You can stop receiving scientific update emails below.", "Unsubscribe");
    await unsubscribe(env, subscriber.id);
    return actionPage("You are unsubscribed", "You will no longer receive scientific update emails from this subscription.");
  }
  if (subscriber.status === "active") return actionPage("You are subscribed", "You will receive scientific updates to NCI Dose Tools.");
  if (subscriber.status !== "pending" || Date.parse(`${subscriber.confirmation_expires_at.replace(" ", "T")}Z`) <= Date.now()) return actionPage("This confirmation link has expired", "Please enter your email on the website to request a new link.", null, 410);
  if (request.method === "GET") return actionPage("Confirm your subscription", "Receive scientific updates to NCI Dose Tools, including advances in dose calculations, models, and scientific data. Maintenance updates are excluded.", "Confirm subscription");
  const jobId = `welcome:${subscriber.id}:${subscriber.confirmation_nonce}`;
  await env.DB.batch([
    env.DB.prepare("UPDATE public_subscribers SET status='active', confirmed_at=CURRENT_TIMESTAMP, unsubscribed_at=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending' AND confirmation_nonce=? AND confirmation_expires_at>CURRENT_TIMESTAMP").bind(subscriber.id, subscriber.confirmation_nonce),
    env.DB.prepare(`INSERT OR IGNORE INTO subscriber_mail_jobs (id,subscriber_id,kind,confirmation_nonce)
      SELECT ?,id,'welcome',confirmation_nonce FROM public_subscribers WHERE id=? AND status='active' AND confirmation_nonce=?`).bind(jobId, subscriber.id, subscriber.confirmation_nonce),
  ]);
  await drainSubscriberMail(env, { jobId, limit: 1 });
  return actionPage("Welcome to NCI Dose Tools updates", "Your subscription is confirmed. A welcome email is on its way. You will receive scientific updates and can unsubscribe at any time.");
}

export async function handlePublicSubscriptions(request, env, context, cors) {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/public/subscriptions")) return null;
  try {
    if (path === "/api/public/subscriptions" && request.method === "POST") return await subscribe(request, env, cors, context);
    const action = path.match(/^\/api\/public\/subscriptions\/(confirm|unsubscribe)$/)?.[1];
    if (action && ["GET", "POST"].includes(request.method)) return await subscriptionAction(request, env, action);
    return json({ error: "not_found" }, 404, cors);
  } catch {
    return json({ error: "subscriptions_unavailable" }, 503, cors);
  }
}

export async function handleAdminSubscribers(request, env, user, cors) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/admin/subscribers")) return null;
  if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
  if (request.method !== "GET" && request.headers.get("origin") && request.headers.get("origin") !== url.origin) return json({ error: "invalid_origin" }, 403, cors);
  if (request.method === "GET" && url.pathname === "/api/admin/subscribers") {
    const query = (url.searchParams.get("q") || "").trim().slice(0, 254);
    const status = ["pending", "active", "unsubscribed"].includes(url.searchParams.get("status")) ? url.searchParams.get("status") : "";
    const page = Math.max(1, Math.min(100000, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1));
    const filter = "WHERE (?='' OR instr(email,lower(?))>0) AND (?='' OR status=?)";
    const [list, total, counts, mail, recentMail] = await Promise.all([
      env.DB.prepare(`SELECT id,email,status,source,created_at,confirmed_at,unsubscribed_at FROM public_subscribers ${filter} ORDER BY created_at DESC,id LIMIT 50 OFFSET ?`).bind(query, query, status, status, (page - 1) * 50).all(),
      env.DB.prepare(`SELECT COUNT(*) AS total FROM public_subscribers ${filter}`).bind(query, query, status, status).first(),
      env.DB.prepare("SELECT status,COUNT(*) AS total FROM public_subscribers GROUP BY status").all(),
      env.DB.prepare("SELECT kind,status,COUNT(*) AS total FROM subscriber_mail_jobs GROUP BY kind,status").all(),
      env.DB.prepare(`SELECT jobs.id,subscribers.email,jobs.kind,jobs.status,jobs.error_message,jobs.created_at,
        COALESCE(campaign.title,CASE jobs.kind WHEN 'welcome' THEN 'Welcome email' ELSE 'Confirm subscription' END) AS title
        FROM subscriber_mail_jobs jobs JOIN public_subscribers subscribers ON subscribers.id=jobs.subscriber_id
        LEFT JOIN subscriber_campaigns campaign ON campaign.announcement_id=jobs.announcement_id
        ORDER BY jobs.created_at DESC,jobs.id LIMIT 20`).all(),
    ]);
    return json({ subscribers: list.results, total: total.total, page, counts: Object.fromEntries(counts.results.map((row) => [row.status, row.total])), mail: mail.results, recentMail: recentMail.results }, 200, cors);
  }
  const match = url.pathname.match(/^\/api\/admin\/subscribers\/([0-9a-f-]+)$/i);
  if (request.method === "PATCH" && match) {
    const input = await request.json();
    if (input.status !== "unsubscribed") return json({ error: "only_unsubscribe_allowed" }, 400, cors);
    if (!await env.DB.prepare("SELECT id FROM public_subscribers WHERE id=?").bind(match[1]).first()) return json({ error: "not_found" }, 404, cors);
    await unsubscribe(env, match[1]);
    await env.DB.prepare("INSERT INTO access_events (id,user_id,event_type,metadata_json) VALUES (?,?,'public_subscriber_unsubscribed',?)").bind(crypto.randomUUID(), user.id, JSON.stringify({ subscriberId: match[1] })).run();
    return json({ ok: true }, 200, cors);
  }
  return json({ error: "not_found" }, 404, cors);
}

export async function queueScientificUpdate(env, announcement) {
  if (!announcement.scientific_update || announcement.category !== "Release" || announcement.status !== "published" || announcement.original_published_at || announcement.source_url) throw new Error("Only current, published Scientific Updates can be emailed to public subscribers.");
  const approvedDelivery = await env.DB.prepare("SELECT status FROM announcement_email_deliveries WHERE announcement_id=?").bind(announcement.id).first();
  if (approvedDelivery?.status === "queued") throw new Error("Wait for the approved-user broadcast to finish before selecting public recipients.");
  // Snapshot content and recipients atomically. Republishing cannot add recipients or send twice.
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO subscriber_campaigns (announcement_id,title,body) VALUES (?,?,?)").bind(announcement.id, announcement.title, announcement.body),
    env.DB.prepare(`INSERT OR IGNORE INTO subscriber_mail_jobs (id,subscriber_id,kind,announcement_id,confirmation_nonce)
      SELECT 'scientific:' || ? || ':' || subscribers.id, subscribers.id, 'scientific', ?, subscribers.confirmation_nonce
      FROM public_subscribers subscribers
      WHERE subscribers.status='active'
        AND EXISTS (SELECT 1 FROM subscriber_campaigns WHERE announcement_id=? AND enqueued=0)
        AND NOT EXISTS (
          SELECT 1 FROM announcement_email_deliveries deliveries, json_each(COALESCE(deliveries.recipient_emails_json,'[]')) recipients
          WHERE deliveries.announcement_id=? AND deliveries.status='sent' AND recipients.value=subscribers.email
        )`).bind(announcement.id, announcement.id, announcement.id, announcement.id),
    env.DB.prepare("UPDATE subscriber_campaigns SET enqueued=1 WHERE announcement_id=?").bind(announcement.id),
  ]);
  return env.DB.prepare("SELECT COUNT(*) AS recipientCount FROM subscriber_mail_jobs WHERE announcement_id=?").bind(announcement.id).first();
}

async function mailPayload(env, job, subscriber) {
  const unsubscribeUrl = await actionUrl(env, subscriber, "unsubscribe");
  let content;
  if (job.kind === "confirmation") {
    content = { title: "Confirm your NCI Dose Tools subscription", body: "Thank you for your interest in NCI Dose Tools.\n\nConfirm your email to receive scientific updates about dose calculations, models, and scientific data. Maintenance updates are excluded.\n\nThis link expires in 24 hours. If you did not request this subscription, you can ignore this email.", actionLabel: "Confirm subscription", actionHref: await actionUrl(env, subscriber, "confirm") };
  } else if (job.kind === "welcome") {
    content = { title: "Welcome to NCI Dose Tools updates", body: "Thank you for subscribing to NCI Dose Tools!\n\nYou will receive scientific updates about dose calculations, models, and scientific data for NCICT, NCINM, NCIRF, and our computational phantoms. Maintenance updates are excluded.\n\nYour email subscription is ready. Software access remains subject to the applicable STA or license agreement.\n\nExplore the latest scientific updates below." };
  } else {
    content = await env.DB.prepare("SELECT title,body FROM subscriber_campaigns WHERE announcement_id=?").bind(job.announcement_id).first();
    if (!content) throw new Error("Scientific update snapshot is missing.");
  }
  const href = content.actionHref || `${website}/manuals#release-history`;
  return { from: env.RESEND_FROM, to: [subscriber.email], subject: content.title,
    html: scientificEmailHtml({ ...content, unsubscribeUrl }),
    text: `${content.title}\n\n${content.body}\n\n${content.actionLabel || "View scientific updates"}: ${href}\n\nNCI Dose Team\nNational Cancer Institute\n\nUnsubscribe: ${unsubscribeUrl}`,
    headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
}

export async function drainSubscriberMail(env, { jobId = null, limit = 20 } = {}) {
  if (!configured(env)) return;
  const started = Date.now();
  const jobs = await env.DB.prepare(`SELECT id FROM subscriber_mail_jobs
    WHERE ((status='queued' AND next_attempt_at<=CURRENT_TIMESTAMP) OR (status='sending' AND lease_until<CURRENT_TIMESTAMP))
      AND (? IS NULL OR id=?) ORDER BY created_at,id LIMIT ?`).bind(jobId, jobId, limit).all();
  for (const entry of jobs.results) {
    if (Date.now() - started > 20000) break;
    const job = await env.DB.prepare(`UPDATE subscriber_mail_jobs SET status='sending',lease_until=datetime('now','+2 minutes'),
      attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,CURRENT_TIMESTAMP)
      WHERE id=? AND ((status='queued' AND next_attempt_at<=CURRENT_TIMESTAMP) OR (status='sending' AND lease_until<CURRENT_TIMESTAMP)) RETURNING *`).bind(entry.id).first();
    if (!job) continue;
    const subscriber = await env.DB.prepare("SELECT * FROM public_subscribers WHERE id=?").bind(job.subscriber_id).first();
    const eligible = subscriber && (job.kind === "confirmation"
      ? subscriber.status === "pending" && subscriber.confirmation_nonce === job.confirmation_nonce && Date.parse(`${subscriber.confirmation_expires_at.replace(" ", "T")}Z`) > Date.now()
      : subscriber.status === "active" && subscriber.confirmation_nonce === job.confirmation_nonce);
    if (!eligible) {
      await env.DB.prepare("UPDATE subscriber_mail_jobs SET status='cancelled',lease_until=NULL WHERE id=?").bind(job.id).run();
      continue;
    }
    // Resend retains idempotency keys for 24h. Never retry an ambiguous send outside that window.
    if (job.attempts > 5 || Date.parse(`${job.first_attempt_at.replace(" ", "T")}Z`) < Date.now() - 12 * 3600000) {
      await env.DB.prepare("UPDATE subscriber_mail_jobs SET status='failed',error_message='Retry window expired; review delivery before resending.',lease_until=NULL WHERE id=?").bind(job.id).run();
      continue;
    }
    try {
      const payload = job.payload_json || JSON.stringify(await mailPayload(env, job, subscriber));
      if (!job.payload_json) await env.DB.prepare("UPDATE subscriber_mail_jobs SET payload_json=? WHERE id=?").bind(payload, job.id).run();
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json", "Idempotency-Key": job.id }, body: payload, signal: AbortSignal.timeout(8000),
      });
      const result = await response.json();
      if (!response.ok || !result.id) {
        const error = new Error(`Email provider returned ${response.status}.`);
        error.permanent = response.status >= 400 && response.status < 500 && ![408, 409, 429].includes(response.status);
        throw error;
      }
      await env.DB.prepare("UPDATE subscriber_mail_jobs SET status='sent',provider_email_id=?,sent_at=CURRENT_TIMESTAMP,lease_until=NULL,error_message=NULL WHERE id=?").bind(result.id, job.id).run();
    } catch (error) {
      await env.DB.prepare("UPDATE subscriber_mail_jobs SET status=?,error_message=?,lease_until=NULL,next_attempt_at=datetime('now','+5 minutes') WHERE id=? AND status='sending'").bind(error.permanent || job.attempts >= 5 ? "failed" : "queued", String(error.message).slice(0, 300), job.id).run();
    }
    if (jobs.results.length > 1) await sleep(600);
  }
}
