const allowedPrefixes = ["NCICT/", "NCINM/", "NCIRF/", "PHANTOM/", "DCC/"];
let cachedKeys;

const json = (body, status = 200, headers = {}) => Response.json(body, {
  status,
  headers: { "cache-control": "no-store", ...headers },
});

const base64UrlBytes = (value) => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
};

const decodeJwtPart = (value) => JSON.parse(new TextDecoder().decode(base64UrlBytes(value)));

async function accessKeys(teamDomain) {
  if (cachedKeys?.teamDomain === teamDomain && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error("Unable to load Cloudflare Access signing keys.");
  const body = await response.json();
  cachedKeys = { teamDomain, keys: body.keys || [], expiresAt: Date.now() + 60 * 60 * 1000 };
  return cachedKeys.keys;
}

async function verifyAccessToken(token, env) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid Access token.");
  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Access token.");

  const key = (await accessKeys(env.ACCESS_TEAM_DOMAIN)).find((candidate) => candidate.kid === header.kid);
  if (!key) throw new Error("Access signing key was not found.");
  const cryptoKey = await crypto.subtle.importKey("jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const validSignature = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    base64UrlBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!validSignature || payload.exp <= now || payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}` || !audiences.includes(env.ACCESS_AUD)) {
    throw new Error("Access token validation failed.");
  }
  if (!payload.email) throw new Error("Access token has no email claim.");
  return payload.email.trim().toLowerCase();
}

async function authenticatedEmail(request, env) {
  const developmentEmail = request.headers.get("x-portal-dev-email")?.trim().toLowerCase();
  const developmentToken = request.headers.get("x-portal-dev-token");
  if (env.ENVIRONMENT === "development" && env.DEV_AUTH_TOKEN && developmentToken === env.DEV_AUTH_TOKEN && developmentEmail) {
    return developmentEmail;
  }
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new Error("Cloudflare Access is not configured.");
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) throw new Error("Cloudflare Access login is required.");
  return verifyAccessToken(token, env);
}

async function userForEmail(email, env) {
  return env.DB.prepare(`
    SELECT users.id, users.display_name, users.institution, users.country, users.role, users.sta_status,
      users.access_status, users.approved_at, identities.normalized_email AS signed_in_email
    FROM user_identities identities
    JOIN users ON users.id = identities.user_id
    WHERE identities.normalized_email = ?
  `).bind(email).first();
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normalizePortalEmail = (value) => {
  const email = cleanText(value, 320).toLowerCase();
  return emailPattern.test(email) ? email : "";
};

const identityFromRow = (identity) => ({
  id: identity.id,
  provider: identity.provider,
  email: identity.normalized_email,
  verified: Boolean(identity.email_verified),
  primary: Boolean(identity.is_primary),
});

async function identitiesForUser(userId, env) {
  const result = await env.DB.prepare(`
    SELECT id, provider, normalized_email, email_verified, is_primary, created_at
    FROM user_identities
    WHERE user_id=?
    ORDER BY is_primary DESC, created_at ASC
  `).bind(userId).all();
  return result.results.map(identityFromRow);
}

const requireSameOrigin = (request, url, cors) => {
  const origin = request.headers.get("origin");
  return origin && origin !== url.origin ? json({ error: "invalid_origin" }, 403, cors) : null;
};

export const isDownloadableKey = (key) => Boolean(
  key && !key.startsWith("_archive/") && !key.includes("..") && allowedPrefixes.some((prefix) => key.startsWith(prefix)),
);

const safeFilename = (key) => (key.split("/").pop() || "download").replaceAll(/[\r\n"]/g, "_");
const announcementCategories = new Set(["Release", "Maintenance", "Access"]);

const cleanText = (value, maximum) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

const announcementFromRow = (row) => ({
  id: row.id,
  title: row.title,
  summary: row.summary,
  body: row.body,
  category: row.category,
  audience: row.audience,
  status: row.status,
  originalPublishedAt: row.original_published_at,
  publishedAt: row.published_at,
  sourceUrl: row.source_url,
  read: Boolean(row.read_at),
  emailDelivery: row.email_delivery_status ? {
    status: row.email_delivery_status,
    recipientCount: row.email_recipient_count,
    providerBroadcastId: row.provider_broadcast_id,
  } : null,
});

const resendApiBase = "https://api.resend.com";

const requireResend = (env) => {
  if (!env.RESEND_API_KEY || !env.RESEND_SEGMENT_ID || !env.RESEND_FROM) {
    throw new Error("Resend email delivery is not configured.");
  }
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function resendRequest(env, path, options = {}) {
  requireResend(env);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`${resendApiBase}${path}`, {
      ...options,
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) return body;
    if (response.status === 429 && attempt === 0) {
      const retryAfter = Math.max(1, Number(response.headers.get("retry-after") || 1));
      await wait(retryAfter * 1000);
      continue;
    }
    const error = new Error(body.message || body.name || `Resend request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  throw new Error("Resend request could not be completed.");
}

async function approvedPrimaryEmails(env) {
  const result = await env.DB.prepare(`
    SELECT identities.normalized_email AS email
    FROM users
    JOIN user_identities identities
      ON identities.user_id=users.id AND identities.is_primary=1
    WHERE users.access_status='active'
    ORDER BY identities.normalized_email COLLATE NOCASE
  `).all();
  return result.results.map((entry) => entry.email).filter(Boolean);
}

async function resendSegmentContacts(env) {
  const contacts = [];
  let after = "";
  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({ limit: "100" });
    if (after) query.set("after", after);
    const body = await resendRequest(env, `/segments/${encodeURIComponent(env.RESEND_SEGMENT_ID)}/contacts?${query}`);
    const entries = Array.isArray(body.data) ? body.data : [];
    contacts.push(...entries);
    if (!body.has_more || entries.length === 0) break;
    after = entries.at(-1)?.id || "";
    if (!after) break;
  }
  return contacts;
}

async function addResendContactToAudience(env, email) {
  try {
    await resendRequest(env, "/contacts", {
      method: "POST",
      body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: env.RESEND_SEGMENT_ID }] }),
    });
  } catch (error) {
    if (error.status !== 409) throw error;
    await resendRequest(env, `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(env.RESEND_SEGMENT_ID)}`, { method: "POST" });
  }
}

const removeResendContactFromAudience = (env, email) => resendRequest(
  env,
  `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(env.RESEND_SEGMENT_ID)}`,
  { method: "DELETE" },
);

async function syncResendAudience(env, maximumChanges = 20) {
  const approvedEmails = await approvedPrimaryEmails(env);
  const contacts = await resendSegmentContacts(env);
  const approved = new Set(approvedEmails);
  const current = new Set(contacts.map((entry) => String(entry.email || "").toLowerCase()).filter(Boolean));
  const changes = [
    ...approvedEmails.filter((email) => !current.has(email)).map((email) => ({ action: "add", email })),
    ...[...current].filter((email) => !approved.has(email)).map((email) => ({ action: "remove", email })),
  ];
  const results = { added: 0, removed: 0, errors: [], remaining: Math.max(0, changes.length - maximumChanges) };
  for (const change of changes.slice(0, maximumChanges)) {
    try {
      if (change.action === "add") {
        await addResendContactToAudience(env, change.email);
        results.added += 1;
      } else {
        await removeResendContactFromAudience(env, change.email);
        results.removed += 1;
      }
    } catch (error) {
      results.errors.push({ email: change.email, action: change.action, message: String(error.message || error) });
    }
    await wait(225);
  }
  return {
    configured: true,
    approvedCount: approved.size,
    segmentCount: current.size + results.added - results.removed,
    unchanged: approvedEmails.filter((email) => current.has(email)).length,
    ...results,
  };
}

const escapeHtml = (value) => String(value || "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export const announcementEmailHtml = (announcement, options = {}) => {
  const preview = options.preview === true;
  const includeUnsubscribe = options.includeUnsubscribe !== false;
  const paragraphs = announcement.body.split(/\n{2,}/).map((paragraph) => `<p style="margin:0 0 18px;line-height:1.65">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`).join("");
  const previewBanner = preview ? `<tr><td style="background:#e8f3fa;border-bottom:1px solid #c8ddea;padding:10px 36px;color:#285a78;font-size:12px;font-weight:700;letter-spacing:.08em;text-align:center;text-transform:uppercase">Preview · Sent only to the portal administrator</td></tr>` : "";
  const unsubscribe = includeUnsubscribe ? `<br><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#44647c;text-decoration:underline">Unsubscribe from announcement emails</a>` : "";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(announcement.title)}</title></head><body style="margin:0;padding:0;background:#edf3f7;color:#172b3a;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(announcement.body.slice(0, 140))}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf3f7"><tr><td align="center" style="padding:32px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#ffffff;border:1px solid #c9d7e2"><tr><td style="background:#123f63;border-bottom:5px solid #2ba8df;padding:25px 36px"><a href="https://ncidose.github.io/" style="color:#ffffff;font-size:24px;font-weight:400;letter-spacing:.01em;text-decoration:none">NCI Dose Tools</a><div style="margin-top:7px;color:#c9e5f4;font-size:11px;letter-spacing:.16em;text-transform:uppercase">User Portal Update</div></td></tr>${previewBanner}<tr><td style="padding:38px 36px 20px"><span style="display:inline-block;background:#e9f5fb;color:#126b9a;font-size:11px;font-weight:700;letter-spacing:.12em;padding:7px 10px;text-transform:uppercase">${escapeHtml(announcement.category)}</span><h1 style="color:#143047;font-size:30px;font-weight:400;line-height:1.25;margin:18px 0 27px">${escapeHtml(announcement.title)}</h1><div style="color:#2c4050;font-size:16px;line-height:1.65">${paragraphs}</div><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0 12px"><tr><td style="background:#147da8"><a href="https://portal.ncidosetools.com" style="display:inline-block;color:#ffffff;font-size:15px;font-weight:700;padding:14px 22px;text-decoration:none">Open NCI Dose Tools User Portal</a></td></tr></table></td></tr><tr><td style="padding:8px 36px 34px"><div style="border-top:1px solid #d8e2ea;padding-top:22px;color:#2b4355;font-size:14px;line-height:1.6">Sincerely,<br><strong>NCI Dose Team</strong><br><a href="https://ncidose.github.io/" style="color:#2b4355;text-decoration:underline">NCI Dose Tools portal</a><br><span style="color:#627688">National Cancer Institute</span></div></td></tr><tr><td style="background:#f4f7f9;border-top:1px solid #d8e2ea;padding:20px 36px;color:#607486;font-size:11px;line-height:1.6">This message was sent to an email linked to an approved NCI Dose Tools User Portal account.${unsubscribe}</td></tr></table></td></tr></table></body></html>`;
};

async function sendAnnouncementBroadcast(env, announcement, requestedByUserId, recipientCount) {
  const existing = await env.DB.prepare("SELECT status FROM announcement_email_deliveries WHERE announcement_id=?").bind(announcement.id).first();
  if (existing) return { status: existing.status, duplicate: true };
  const deliveryId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO announcement_email_deliveries (id, announcement_id, status, recipient_count, requested_by_user_id)
    VALUES (?, ?, 'queued', ?, ?)
  `).bind(deliveryId, announcement.id, recipientCount, requestedByUserId).run();
  try {
    const broadcast = await resendRequest(env, "/broadcasts", {
      method: "POST",
      body: JSON.stringify({
        segment_id: env.RESEND_SEGMENT_ID,
        from: env.RESEND_FROM,
        subject: announcement.title,
        name: `NCI Dose Tools - ${announcement.title}`.slice(0, 120),
        html: announcementEmailHtml(announcement),
        text: `NCI Dose Tools: https://ncidose.github.io/\n\n${announcement.title}\n\n${announcement.body}\n\nOpen User Portal: https://portal.ncidosetools.com\n\nSincerely,\nNCI Dose Team\nNCI Dose Tools portal: https://ncidose.github.io/\nNational Cancer Institute\n\nUnsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`,
        send: true,
      }),
    });
    await env.DB.prepare(`
      UPDATE announcement_email_deliveries
      SET status='sent', provider_broadcast_id=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(broadcast.id || null, deliveryId).run();
    return { status: "sent", recipientCount, providerBroadcastId: broadcast.id || null };
  } catch (error) {
    await env.DB.prepare(`
      UPDATE announcement_email_deliveries
      SET status='failed', error_message=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(String(error.message || error).slice(0, 1000), deliveryId).run();
    return { status: "failed", recipientCount, error: String(error.message || error) };
  }
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  return origin && allowed.includes(origin) ? {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type,x-portal-dev-email,x-portal-dev-token",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    vary: "Origin",
  } : {};
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "ncidose-portal-api" }, 200, cors);
    // Cloudflare Access verifies control of the email address. Serve the portal
    // shell after that check so the app can explain an unapproved D1 identity;
    // every API and download route remains protected by the authorization check below.
    if (request.method === "GET" && !url.pathname.startsWith("/api/") && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    try {
      const email = await authenticatedEmail(request, env);
      const user = await userForEmail(email, env);
      if (!user || user.access_status !== "active") return json({ error: "portal_access_denied", email }, 403, cors);

      if (request.method === "GET" && url.pathname === "/api/me") {
        await env.DB.prepare("UPDATE user_identities SET email_verified=1, updated_at=CURRENT_TIMESTAMP WHERE normalized_email=?").bind(email).run();
        const identities = await identitiesForUser(user.id, env);
        const primaryEmail = identities.find((identity) => identity.primary)?.email || email;
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'login', ?)").bind(crypto.randomUUID(), user.id, JSON.stringify({ email })).run());
        return json({ user: { ...user, primary_email: primaryEmail, identities } }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/api/account/emails") {
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const input = await request.json();
        const newEmail = normalizePortalEmail(input.email);
        if (!newEmail) return json({ error: "valid_email_required" }, 400, cors);
        const existing = await env.DB.prepare("SELECT id, user_id FROM user_identities WHERE normalized_email=?").bind(newEmail).first();
        if (existing) return json({ error: existing.user_id === user.id ? "email_already_linked" : "email_in_use" }, 409, cors);
        const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM user_identities WHERE user_id=?").bind(user.id).first();
        if (Number(count.total) >= 2) return json({ error: "additional_email_limit" }, 409, cors);
        const id = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO user_identities (id, user_id, provider, normalized_email, email_verified, is_primary)
          VALUES (?, ?, 'user_added', ?, 0, 0)
        `).bind(id, user.id, newEmail).run();
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'email_added', ?)").bind(crypto.randomUUID(), user.id, JSON.stringify({ email: newEmail })).run());
        return json({ identity: { id, provider: "user_added", email: newEmail, verified: false, primary: false } }, 201, cors);
      }

      if (request.method === "PATCH" && url.pathname === "/api/account/profile") {
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const input = await request.json();
        const displayName = cleanText(input.name, 200) || null;
        const institution = cleanText(input.institution, 300) || null;
        const country = cleanText(input.country, 120) || null;
        await env.DB.prepare("UPDATE users SET display_name=?, institution=?, country=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(displayName, institution, country, user.id).run();
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type) VALUES (?, ?, 'profile_updated')").bind(crypto.randomUUID(), user.id).run());
        return json({ profile: { name: displayName, institution, country } }, 200, cors);
      }

      const accountEmailMatch = url.pathname.match(/^\/api\/account\/emails\/([0-9a-f-]+)$/i);
      if (request.method === "DELETE" && accountEmailMatch) {
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const identity = await env.DB.prepare("SELECT id, normalized_email, is_primary FROM user_identities WHERE id=? AND user_id=?").bind(accountEmailMatch[1], user.id).first();
        if (!identity) return json({ error: "email_not_found" }, 404, cors);
        if (identity.is_primary) return json({ error: "primary_email_cannot_be_removed" }, 409, cors);
        await env.DB.prepare("DELETE FROM user_identities WHERE id=? AND user_id=?").bind(identity.id, user.id).run();
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'email_removed', ?)").bind(crypto.randomUUID(), user.id, JSON.stringify({ email: identity.normalized_email })).run());
        return new Response(null, { status: 204, headers: cors });
      }

      if (request.method === "GET" && url.pathname === "/api/admin/users") {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const [usersResult, identitiesResult] = await Promise.all([
          env.DB.prepare(`
            SELECT users.id, users.display_name, users.institution, users.country, users.role, users.sta_status,
              users.access_status, users.approval_source, users.approved_at, users.created_at,
              (SELECT MAX(events.occurred_at) FROM access_events events
                WHERE events.user_id=users.id AND events.event_type='login') AS last_login_at
            FROM users
            ORDER BY COALESCE(users.display_name, '') COLLATE NOCASE, users.created_at DESC
            LIMIT 1000
          `).all(),
          env.DB.prepare(`
            SELECT identities.id, identities.user_id, identities.provider, identities.normalized_email,
              identities.email_verified, identities.is_primary, identities.created_at
            FROM user_identities identities
            JOIN users ON users.id=identities.user_id
            ORDER BY identities.is_primary DESC, identities.created_at ASC
          `).all(),
        ]);
        const identitiesByUser = new Map();
        for (const identity of identitiesResult.results) {
          const entries = identitiesByUser.get(identity.user_id) || [];
          entries.push(identityFromRow(identity));
          identitiesByUser.set(identity.user_id, entries);
        }
        return json({
          users: usersResult.results.map((entry) => ({
            id: entry.id,
            name: entry.display_name,
            institution: entry.institution,
            country: entry.country,
            role: entry.role,
            staStatus: entry.sta_status,
            accessStatus: entry.access_status,
            approvalSource: entry.approval_source,
            approvedAt: entry.approved_at,
            createdAt: entry.created_at,
            lastLoginAt: entry.last_login_at,
            identities: identitiesByUser.get(entry.id) || [],
          })),
        }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/admin/activity") {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const [summary, toolResult, fileResult, recentResult] = await Promise.all([
          env.DB.prepare(`
            SELECT
              SUM(CASE WHEN event_type='download' AND occurred_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END) AS downloads_today,
              SUM(CASE WHEN event_type='download' AND occurred_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS downloads_7_days,
              SUM(CASE WHEN event_type='download' AND occurred_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS downloads_30_days,
              COUNT(DISTINCT CASE WHEN event_type='download' AND occurred_at >= datetime('now', '-30 days') THEN user_id END) AS download_users_30_days,
              SUM(CASE WHEN event_type='login' AND occurred_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS logins_30_days
            FROM access_events
          `).first(),
          env.DB.prepare(`
            SELECT CASE WHEN instr(object_key, '/') > 0 THEN substr(object_key, 1, instr(object_key, '/') - 1) ELSE object_key END AS tool,
              COUNT(*) AS downloads
            FROM access_events
            WHERE event_type='download' AND occurred_at >= datetime('now', '-30 days') AND object_key IS NOT NULL
            GROUP BY tool
            ORDER BY downloads DESC, tool ASC
          `).all(),
          env.DB.prepare(`
            SELECT object_key AS file, COUNT(*) AS downloads
            FROM access_events
            WHERE event_type='download' AND occurred_at >= datetime('now', '-30 days') AND object_key IS NOT NULL
            GROUP BY object_key
            ORDER BY downloads DESC, object_key ASC
            LIMIT 20
          `).all(),
          env.DB.prepare(`
            SELECT events.id, events.event_type, events.object_key, events.occurred_at,
              users.display_name,
              (SELECT identities.normalized_email FROM user_identities identities
                WHERE identities.user_id=events.user_id
                ORDER BY identities.is_primary DESC, identities.created_at ASC LIMIT 1) AS email
            FROM access_events events
            LEFT JOIN users ON users.id=events.user_id
            WHERE events.event_type IN ('login', 'download')
            ORDER BY events.occurred_at DESC
            LIMIT 100
          `).all(),
        ]);
        return json({
          summary: {
            downloadsToday: Number(summary.downloads_today || 0),
            downloads7Days: Number(summary.downloads_7_days || 0),
            downloads30Days: Number(summary.downloads_30_days || 0),
            downloadUsers30Days: Number(summary.download_users_30_days || 0),
            logins30Days: Number(summary.logins_30_days || 0),
          },
          tools: toolResult.results.map((entry) => ({ tool: entry.tool || "Other", downloads: Number(entry.downloads) })),
          files: fileResult.results.map((entry) => ({ file: entry.file, downloads: Number(entry.downloads) })),
          recent: recentResult.results.map((entry) => ({
            id: entry.id,
            eventType: entry.event_type,
            file: entry.object_key,
            occurredAt: entry.occurred_at,
            name: entry.display_name,
            email: entry.email,
          })),
        }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/api/admin/users") {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const input = await request.json();
        const approvedEmail = normalizePortalEmail(input.email);
        const displayName = cleanText(input.name, 200);
        const institution = cleanText(input.institution, 300);
        const country = cleanText(input.country, 120);
        const approvedAt = cleanText(input.approvedAt, 40) || new Date().toISOString().slice(0, 10);
        if (!approvedEmail || !displayName) return json({ error: "name_and_valid_email_required" }, 400, cors);
        const existing = await env.DB.prepare("SELECT id FROM user_identities WHERE normalized_email=?").bind(approvedEmail).first();
        if (existing) return json({ error: "email_in_use" }, 409, cors);
        const userId = crypto.randomUUID();
        const identityId = crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO users (id, display_name, institution, country, role, sta_status, access_status, approval_source, approved_at)
            VALUES (?, ?, ?, ?, 'user', 'approved', 'active', 'sta_admin', ?)
          `).bind(userId, displayName, institution || null, country || null, approvedAt),
          env.DB.prepare(`
            INSERT INTO user_identities (id, user_id, provider, normalized_email, email_verified, is_primary)
            VALUES (?, ?, 'sta_approved', ?, 0, 1)
          `).bind(identityId, userId, approvedEmail),
          env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'user_activated', ?)").bind(crypto.randomUUID(), userId, JSON.stringify({ approvedEmail, activatedBy: user.id })),
        ]);
        if (env.RESEND_API_KEY && env.RESEND_SEGMENT_ID) {
          context.waitUntil(addResendContactToAudience(env, approvedEmail).catch(() => undefined));
        }
        return json({
          user: {
            id: userId,
            name: displayName,
            institution: institution || null,
            country: country || null,
            role: "user",
            staStatus: "approved",
            accessStatus: "active",
            approvalSource: "sta_admin",
            approvedAt,
            createdAt: new Date().toISOString(),
            lastLoginAt: null,
            identities: [{ id: identityId, provider: "sta_approved", email: approvedEmail, verified: false, primary: true }],
          },
        }, 201, cors);
      }

      const adminUserMatch = url.pathname.match(/^\/api\/admin\/users\/([0-9a-z_-]+)$/i);
      if (request.method === "PATCH" && adminUserMatch) {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const input = await request.json();
        const accessStatus = input.accessStatus === "active" ? "active" : input.accessStatus === "suspended" ? "suspended" : "";
        if (!accessStatus) return json({ error: "valid_access_status_required" }, 400, cors);
        if (adminUserMatch[1] === user.id && accessStatus === "suspended") return json({ error: "cannot_suspend_current_admin" }, 409, cors);
        const existing = await env.DB.prepare(`
          SELECT users.id, identities.normalized_email AS primary_email
          FROM users
          LEFT JOIN user_identities identities ON identities.user_id=users.id AND identities.is_primary=1
          WHERE users.id=?
        `).bind(adminUserMatch[1]).first();
        if (!existing) return json({ error: "user_not_found" }, 404, cors);
        await env.DB.prepare("UPDATE users SET access_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(accessStatus, adminUserMatch[1]).run();
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'access_status_changed', ?)").bind(crypto.randomUUID(), adminUserMatch[1], JSON.stringify({ accessStatus, changedBy: user.id })).run());
        if (existing.primary_email && env.RESEND_API_KEY && env.RESEND_SEGMENT_ID) {
          const syncContact = accessStatus === "active"
            ? addResendContactToAudience(env, existing.primary_email)
            : removeResendContactFromAudience(env, existing.primary_email);
          context.waitUntil(syncContact.catch(() => undefined));
        }
        return json({ id: adminUserMatch[1], accessStatus }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/admin/email-audience") {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        try {
          requireResend(env);
          const [approvedEmails, contacts] = await Promise.all([approvedPrimaryEmails(env), resendSegmentContacts(env)]);
          const approved = new Set(approvedEmails);
          const current = new Set(contacts.map((entry) => String(entry.email || "").toLowerCase()).filter(Boolean));
          return json({
            configured: true,
            approvedCount: approved.size,
            segmentCount: current.size,
            pendingAdds: approvedEmails.filter((email) => !current.has(email)).length,
            pendingRemovals: [...current].filter((email) => !approved.has(email)).length,
          }, 200, cors);
        } catch (error) {
          return json({ error: "resend_audience_unavailable", detail: String(error.message || error) }, 502, cors);
        }
      }

      if (request.method === "POST" && url.pathname === "/api/admin/email-audience/sync") {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        try {
          return json(await syncResendAudience(env), 200, cors);
        } catch (error) {
          return json({ error: "resend_audience_sync_failed", detail: String(error.message || error) }, 502, cors);
        }
      }

      if (request.method === "POST" && url.pathname === "/api/admin/email-audience/test") {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        try {
          const input = await request.json();
          const title = cleanText(input.title, 240);
          const body = cleanText(input.body, 20000);
          const category = announcementCategories.has(input.category) ? input.category : "Release";
          if (!title || !body) return json({ error: "title_and_body_required" }, 400, cors);
          const previewAnnouncement = { title, body, category };
          const result = await resendRequest(env, "/emails", {
            method: "POST",
            body: JSON.stringify({
              from: env.RESEND_FROM,
              to: [user.signed_in_email],
              subject: `[Preview] ${title}`,
              html: announcementEmailHtml(previewAnnouncement, { preview: true, includeUnsubscribe: false }),
              text: `PREVIEW — sent only to the portal administrator\n\nNCI Dose Tools: https://ncidose.github.io/\n\n${title}\n\n${body}\n\nOpen NCI Dose Tools User Portal: https://portal.ncidosetools.com\n\nSincerely,\nNCI Dose Team\nNCI Dose Tools portal: https://ncidose.github.io/\nNational Cancer Institute`,
            }),
          });
          return json({ sentTo: user.signed_in_email, id: result.id || null }, 200, cors);
        } catch (error) {
          return json({ error: "resend_test_failed", detail: String(error.message || error) }, 502, cors);
        }
      }

      if (request.method === "GET" && url.pathname === "/api/announcements") {
        const includeDrafts = url.searchParams.get("includeDrafts") === "1" && user.role === "admin";
        const result = await env.DB.prepare(`
          SELECT announcements.id, announcements.title, announcements.summary, announcements.body,
            announcements.category, announcements.audience, announcements.status,
            announcements.original_published_at, announcements.published_at, announcements.source_url,
            announcement_reads.read_at, deliveries.status AS email_delivery_status,
            deliveries.recipient_count AS email_recipient_count,
            deliveries.provider_broadcast_id
          FROM announcements
          LEFT JOIN announcement_reads
            ON announcement_reads.announcement_id = announcements.id
            AND announcement_reads.user_id = ?
          LEFT JOIN announcement_email_deliveries deliveries
            ON deliveries.announcement_id = announcements.id
          ${includeDrafts ? "" : "WHERE announcements.status='published'"}
          ORDER BY COALESCE(announcements.original_published_at, announcements.published_at, announcements.created_at) DESC
          LIMIT 200
        `).bind(user.id).all();
        return json({ announcements: result.results.map(announcementFromRow) }, 200, cors);
      }

      const announcementReadMatch = url.pathname.match(/^\/api\/announcements\/([a-z0-9_-]+)\/read$/i);
      if (request.method === "POST" && announcementReadMatch) {
        const origin = request.headers.get("origin");
        if (origin && origin !== url.origin) return json({ error: "invalid_origin" }, 403, cors);
        const announcement = await env.DB.prepare(
          "SELECT id FROM announcements WHERE id=? AND status='published'",
        ).bind(announcementReadMatch[1]).first();
        if (!announcement) return json({ error: "announcement_not_found" }, 404, cors);
        await env.DB.prepare(`
          INSERT INTO announcement_reads (user_id, announcement_id)
          VALUES (?, ?)
          ON CONFLICT(user_id, announcement_id) DO NOTHING
        `).bind(user.id, announcement.id).run();
        return new Response(null, { status: 204, headers: cors });
      }

      if (request.method === "POST" && url.pathname === "/api/admin/announcements") {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const origin = request.headers.get("origin");
        if (origin && origin !== url.origin) return json({ error: "invalid_origin" }, 403, cors);
        const input = await request.json();
        const title = cleanText(input.title, 240);
        const body = cleanText(input.body, 20000);
        const summary = cleanText(input.summary, 600) || body.slice(0, 300);
        const category = announcementCategories.has(input.category) ? input.category : "Release";
        const status = input.status === "published" ? "published" : "draft";
        const originalPublishedAt = cleanText(input.originalPublishedAt, 40) || null;
        const sourceUrl = cleanText(input.sourceUrl, 1000) || null;
        const sendEmail = input.sendEmail === true;
        if (!title || !body) return json({ error: "title_and_body_required" }, 400, cors);
        if (sourceUrl && !sourceUrl.startsWith("https://groups.google.com/g/ncidose")) {
          return json({ error: "invalid_source_url" }, 400, cors);
        }
        if (sendEmail && status !== "published") return json({ error: "email_requires_published_announcement" }, 400, cors);
        if (sendEmail && (originalPublishedAt || sourceUrl)) return json({ error: "historical_announcement_email_not_allowed" }, 400, cors);
        let audienceSync = null;
        if (sendEmail) {
          try {
            audienceSync = await syncResendAudience(env);
          } catch (error) {
            return json({ error: "resend_audience_sync_failed", detail: String(error.message || error) }, 502, cors);
          }
          if (audienceSync.errors.length || audienceSync.remaining) return json({ error: "resend_audience_sync_required", audienceSync }, 409, cors);
        }
        const id = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO announcements (
            id, title, summary, body, category, audience, status, original_published_at,
            published_at, source_url, created_by_user_id
          ) VALUES (?, ?, ?, ?, ?, 'approved_users', ?, ?, CASE WHEN ?='published' THEN CURRENT_TIMESTAMP END, ?, ?)
        `).bind(id, title, summary, body, category, status, originalPublishedAt, status, sourceUrl, user.id).run();
        const created = await env.DB.prepare(`
          SELECT announcements.id, announcements.title, announcements.summary, announcements.body,
            announcements.category, announcements.audience, announcements.status,
            announcements.original_published_at, announcements.published_at, announcements.source_url,
            deliveries.status AS email_delivery_status, deliveries.recipient_count AS email_recipient_count,
            deliveries.provider_broadcast_id
          FROM announcements
          LEFT JOIN announcement_email_deliveries deliveries ON deliveries.announcement_id=announcements.id
          WHERE announcements.id=?
        `).bind(id).first();
        const emailDelivery = sendEmail ? await sendAnnouncementBroadcast(env, created, user.id, audienceSync.approvedCount) : null;
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'announcement_created', ?)").bind(crypto.randomUUID(), user.id, JSON.stringify({ announcementId: id, status })).run());
        return json({ announcement: { ...announcementFromRow(created), emailDelivery }, emailDelivery }, 201, cors);
      }

      const announcementMatch = url.pathname.match(/^\/api\/admin\/announcements\/([0-9a-f-]+)$/i);
      if (request.method === "PATCH" && announcementMatch) {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const origin = request.headers.get("origin");
        if (origin && origin !== url.origin) return json({ error: "invalid_origin" }, 403, cors);
        const existing = await env.DB.prepare("SELECT id FROM announcements WHERE id=?").bind(announcementMatch[1]).first();
        if (!existing) return json({ error: "announcement_not_found" }, 404, cors);
        const input = await request.json();
        const title = cleanText(input.title, 240);
        const body = cleanText(input.body, 20000);
        const summary = cleanText(input.summary, 600) || body.slice(0, 300);
        const category = announcementCategories.has(input.category) ? input.category : "Release";
        const status = input.status === "published" ? "published" : "draft";
        const originalPublishedAt = cleanText(input.originalPublishedAt, 40) || null;
        const sourceUrl = cleanText(input.sourceUrl, 1000) || null;
        const sendEmail = input.sendEmail === true;
        if (!title || !body) return json({ error: "title_and_body_required" }, 400, cors);
        if (sourceUrl && !sourceUrl.startsWith("https://groups.google.com/g/ncidose")) {
          return json({ error: "invalid_source_url" }, 400, cors);
        }
        if (sendEmail && status !== "published") return json({ error: "email_requires_published_announcement" }, 400, cors);
        if (sendEmail && (originalPublishedAt || sourceUrl)) return json({ error: "historical_announcement_email_not_allowed" }, 400, cors);
        let audienceSync = null;
        if (sendEmail) {
          try {
            audienceSync = await syncResendAudience(env);
          } catch (error) {
            return json({ error: "resend_audience_sync_failed", detail: String(error.message || error) }, 502, cors);
          }
          if (audienceSync.errors.length || audienceSync.remaining) return json({ error: "resend_audience_sync_required", audienceSync }, 409, cors);
        }
        await env.DB.prepare(`
          UPDATE announcements SET
            title=?, summary=?, body=?, category=?, status=?, original_published_at=?,
            published_at=CASE WHEN ?='published' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE NULL END,
            source_url=?, updated_at=CURRENT_TIMESTAMP
          WHERE id=?
        `).bind(title, summary, body, category, status, originalPublishedAt, status, sourceUrl, announcementMatch[1]).run();
        const updated = await env.DB.prepare(`
          SELECT announcements.id, announcements.title, announcements.summary, announcements.body,
            announcements.category, announcements.audience, announcements.status,
            announcements.original_published_at, announcements.published_at, announcements.source_url,
            deliveries.status AS email_delivery_status, deliveries.recipient_count AS email_recipient_count,
            deliveries.provider_broadcast_id
          FROM announcements
          LEFT JOIN announcement_email_deliveries deliveries ON deliveries.announcement_id=announcements.id
          WHERE announcements.id=?
        `).bind(announcementMatch[1]).first();
        const emailDelivery = sendEmail ? await sendAnnouncementBroadcast(env, updated, user.id, audienceSync.approvedCount) : updated.email_delivery_status ? {
          status: updated.email_delivery_status,
          recipientCount: updated.email_recipient_count,
          providerBroadcastId: updated.provider_broadcast_id,
        } : null;
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'announcement_updated', ?)").bind(crypto.randomUUID(), user.id, JSON.stringify({ announcementId: announcementMatch[1], status })).run());
        return json({ announcement: { ...announcementFromRow(updated), emailDelivery }, emailDelivery }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/files") {
        const prefix = url.searchParams.get("prefix") || "";
        if (prefix && !allowedPrefixes.some((allowed) => prefix.startsWith(allowed) || allowed.startsWith(prefix))) {
          return json({ error: "invalid_prefix" }, 400, cors);
        }
        const result = await env.BUCKET.list({ prefix, delimiter: "/", limit: 200, cursor: url.searchParams.get("cursor") || undefined });
        return json({
          objects: result.objects.filter((object) => isDownloadableKey(object.key)).map((object) => ({ key: object.key, size: object.size, etag: object.httpEtag })),
          folders: result.delimitedPrefixes.filter((folder) => allowedPrefixes.some((allowed) => folder.startsWith(allowed))),
          cursor: result.truncated ? result.cursor : null,
        }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/download") {
        const key = url.searchParams.get("key") || "";
        if (!isDownloadableKey(key)) return json({ error: "invalid_object_key" }, 400, cors);
        const object = await env.BUCKET.get(key);
        if (!object) return json({ error: "file_not_found" }, 404, cors);
        const eventId = crypto.randomUUID();
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, object_key) VALUES (?, ?, 'download', ?)").bind(eventId, user.id, key).run());
        const headers = new Headers(cors);
        object.writeHttpMetadata(headers);
        headers.set("content-disposition", `attachment; filename="${safeFilename(key)}"`);
        headers.set("content-length", String(object.size));
        headers.set("etag", object.httpEtag);
        headers.set("cache-control", "private, no-store");
        return new Response(object.body, { headers });
      }

      return json({ error: "not_found" }, 404, cors);
    } catch (error) {
      return json({ error: "authentication_required", detail: env.ENVIRONMENT === "development" ? String(error) : undefined }, 401, cors);
    }
  },
};
