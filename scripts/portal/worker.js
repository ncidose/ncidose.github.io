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
    SELECT users.id, users.display_name, users.institution, users.role, users.sta_status,
      users.access_status, identities.normalized_email AS signed_in_email
    FROM user_identities identities
    JOIN users ON users.id = identities.user_id
    WHERE identities.normalized_email = ?
  `).bind(email).first();
}

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
});

function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  return origin && allowed.includes(origin) ? {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type,x-portal-dev-email,x-portal-dev-token",
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    vary: "Origin",
  } : {};
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "ncidose-portal-api" }, 200, cors);

    try {
      const email = await authenticatedEmail(request, env);
      const user = await userForEmail(email, env);
      if (!user || user.access_status !== "active") return json({ error: "portal_access_denied" }, 403, cors);

      if (request.method === "GET" && url.pathname === "/api/me") {
        context.waitUntil(env.DB.prepare("UPDATE user_identities SET email_verified=1, updated_at=CURRENT_TIMESTAMP WHERE normalized_email=?").bind(email).run());
        return json({ user }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/announcements") {
        const includeDrafts = url.searchParams.get("includeDrafts") === "1" && user.role === "admin";
        const result = await env.DB.prepare(`
          SELECT announcements.id, announcements.title, announcements.summary, announcements.body,
            announcements.category, announcements.audience, announcements.status,
            announcements.original_published_at, announcements.published_at, announcements.source_url,
            announcement_reads.read_at
          FROM announcements
          LEFT JOIN announcement_reads
            ON announcement_reads.announcement_id = announcements.id
            AND announcement_reads.user_id = ?
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
        if (!title || !body) return json({ error: "title_and_body_required" }, 400, cors);
        if (sourceUrl && !sourceUrl.startsWith("https://groups.google.com/g/ncidose")) {
          return json({ error: "invalid_source_url" }, 400, cors);
        }
        const id = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO announcements (
            id, title, summary, body, category, audience, status, original_published_at,
            published_at, source_url, created_by_user_id
          ) VALUES (?, ?, ?, ?, ?, 'approved_users', ?, ?, CASE WHEN ?='published' THEN CURRENT_TIMESTAMP END, ?, ?)
        `).bind(id, title, summary, body, category, status, originalPublishedAt, status, sourceUrl, user.id).run();
        const created = await env.DB.prepare(`
          SELECT id, title, summary, body, category, audience, status, original_published_at, published_at, source_url
          FROM announcements WHERE id=?
        `).bind(id).first();
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'announcement_created', ?)").bind(crypto.randomUUID(), user.id, JSON.stringify({ announcementId: id, status })).run());
        return json({ announcement: announcementFromRow(created) }, 201, cors);
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
        if (!title || !body) return json({ error: "title_and_body_required" }, 400, cors);
        if (sourceUrl && !sourceUrl.startsWith("https://groups.google.com/g/ncidose")) {
          return json({ error: "invalid_source_url" }, 400, cors);
        }
        await env.DB.prepare(`
          UPDATE announcements SET
            title=?, summary=?, body=?, category=?, status=?, original_published_at=?,
            published_at=CASE WHEN ?='published' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE NULL END,
            source_url=?, updated_at=CURRENT_TIMESTAMP
          WHERE id=?
        `).bind(title, summary, body, category, status, originalPublishedAt, status, sourceUrl, announcementMatch[1]).run();
        const updated = await env.DB.prepare(`
          SELECT id, title, summary, body, category, audience, status, original_published_at, published_at, source_url
          FROM announcements WHERE id=?
        `).bind(announcementMatch[1]).first();
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'announcement_updated', ?)").bind(crypto.randomUUID(), user.id, JSON.stringify({ announcementId: announcementMatch[1], status })).run());
        return json({ announcement: announcementFromRow(updated) }, 200, cors);
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

      if (request.method === "GET" && env.ASSETS) return env.ASSETS.fetch(request);
      return json({ error: "not_found" }, 404, cors);
    } catch (error) {
      return json({ error: "authentication_required", detail: env.ENVIRONMENT === "development" ? String(error) : undefined }, 401, cors);
    }
  },
};
