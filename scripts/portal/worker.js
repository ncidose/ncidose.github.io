const allowedPrefixes = ["NCICT/", "NCINM/", "NCIRF/", "PHANTOM/", "DCC/"];
const portalSessionCookie = "__Host-ncidose_session";
const loginCodeLifetimeMinutes = 10;
const portalSessionLifetimeDays = 30;
const qaAttachmentMaximumBytes = 10 * 1024 * 1024;
const qaAttachmentMaximumCount = 3;
const qaRequestTypes = new Set(["technical_question", "bug_report", "feature_request"]);
const qaRequestTypeLabel = (value) => ({
  technical_question: "Technical question",
  bug_report: "Bug report",
  feature_request: "Feature request",
}[value] || "Technical question");
const qaAttachmentTypes = new Map([
  ["application/pdf", ["pdf"]],
  ["image/png", ["png"]],
  ["image/jpeg", ["jpg", "jpeg"]],
  ["text/plain", ["txt", "log"]],
  ["text/csv", ["csv"]],
  ["application/zip", ["zip"]],
  ["application/x-zip-compressed", ["zip"]],
]);
let cachedKeys;

export const qaAttachmentValidationError = (file) => {
  if (!file || typeof file.name !== "string" || !Number(file.size)) return "attachment_required";
  if (file.size > qaAttachmentMaximumBytes) return "attachment_too_large";
  const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
  const extensions = qaAttachmentTypes.get(String(file.type || "").toLowerCase());
  return extensions?.includes(extension) ? "" : "attachment_type_not_allowed";
};

const safeAttachmentName = (value) => String(value || "attachment")
  .normalize("NFKC")
  .replace(/[\\/\0-\x1f\x7f]/g, "_")
  .slice(0, 180) || "attachment";

const attachmentDisposition = (fileName) => {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

const json = (body, status = 200, headers = {}) => {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("cache-control", "no-store");
  return Response.json(body, { status, headers: responseHeaders });
};

const base64UrlBytes = (value) => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
};

const decodeJwtPart = (value) => JSON.parse(new TextDecoder().decode(base64UrlBytes(value)));

const bytesToBase64Url = (bytes) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const randomToken = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
};

export const generateLoginCode = () => {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return String(value[0] % 1_000_000).padStart(6, "0");
};

async function keyedHash(value, secret) {
  if (!secret) throw new Error("Portal authentication secret is not configured.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

const constantTimeEqual = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
};

const cookieValue = (request, name) => {
  const cookies = request.headers.get("cookie") || "";
  for (const part of cookies.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
};

export const portalSessionCookieHeader = (token, maximumAge = portalSessionLifetimeDays * 24 * 60 * 60) =>
  `${portalSessionCookie}=${encodeURIComponent(token)}; Path=/; Max-Age=${maximumAge}; HttpOnly; Secure; SameSite=Lax`;

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

async function sessionEmail(request, env) {
  const token = cookieValue(request, portalSessionCookie);
  if (!token || !env.AUTH_SECRET) return "";
  const tokenHash = await keyedHash(`session:${token}`, env.AUTH_SECRET);
  const session = await env.DB.prepare(`
    SELECT identities.normalized_email AS email, sessions.id
    FROM portal_sessions sessions
    JOIN users ON users.id=sessions.user_id
    JOIN user_identities identities ON identities.id=sessions.identity_id
    WHERE sessions.token_hash=? AND sessions.revoked_at IS NULL
      AND sessions.expires_at > CURRENT_TIMESTAMP AND users.access_status='active'
  `).bind(tokenHash).first();
  if (!session) return "";
  await env.DB.prepare("UPDATE portal_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?").bind(session.id).run();
  return session.email;
}

async function authenticatedEmail(request, env) {
  const portalEmail = await sessionEmail(request, env);
  if (portalEmail) return portalEmail;
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
      users.access_status, users.approved_at, users.discussion_role, users.discussion_handle,
      identities.normalized_email AS signed_in_email
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
const discussionHandle = (value, fallback = "member") => {
  const normalized = cleanText(value, 80).replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9._-]+/g, "");
  if (normalized) return normalized;
  const fallbackHandle = cleanText(fallback, 200).toLowerCase().replace(/[^a-z0-9._-]+/g, "");
  return fallbackHandle || "member";
};
export const isDiscussionTeamUser = (user) => user?.role === "admin" || user?.discussion_role === "team";
export const discussionAuthorForUser = (user) => {
  const type = isDiscussionTeamUser(user) ? "team" : "community";
  return {
    type,
    name: type === "team"
      ? `@${discussionHandle(user?.discussion_handle, user?.display_name || String(user?.signed_in_email || "").split("@")[0])}`
      : cleanText(user?.display_name, 200) || `@${discussionHandle(null, String(user?.signed_in_email || "").split("@")[0])}`,
  };
};
export const canViewDiscussion = (question, user) => Boolean(
  question
  && user
  && (
    (question.status === "published" && question.visibility === "public_after_review")
    || question.submitted_by_user_id === user.id
    || isDiscussionTeamUser(user)
  )
);
const questionTools = new Set(["NCICT", "NCIRF", "NCINM", "PHANTOM", "General"]);
const questionStatuses = new Set(["submitted", "draft", "published", "archived"]);
const questionVisibilities = new Set(["public_after_review", "team_only"]);
export const normalizeQuestionVisibility = (value) => questionVisibilities.has(value) ? value : "public_after_review";
export const canPublishQuestion = (visibility) => normalizeQuestionVisibility(visibility) !== "team_only";

const questionFromRow = (row) => ({
  id: row.id,
  tool: row.tool,
  requestType: row.request_type || "technical_question",
  pinned: Boolean(row.is_pinned),
  authorName: row.author_name || null,
  authorType: row.author_type || "community",
  visibility: row.visibility || "public_after_review",
  title: row.title,
  body: row.body,
  status: row.status,
  source: row.source,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  publishedAt: row.published_at,
  submitter: row.submitter_name || row.submitter_email ? {
    name: row.submitter_name || null,
    email: row.submitter_email || null,
    institution: row.submitter_institution || null,
  } : undefined,
  attachments: [],
  answers: [],
});

const attachmentFromRow = (row) => ({
  id: row.id,
  fileName: row.file_name,
  contentType: row.content_type,
  sizeBytes: Number(row.size_bytes),
  createdAt: row.created_at,
});

async function loadQuestions(env, { publicOnly = false, viewer = null } = {}) {
  const conditions = [];
  const bindings = [];
  if (publicOnly) conditions.push("questions.status='published'", "questions.visibility='public_after_review'");
  if (viewer) {
    if (isDiscussionTeamUser(viewer)) {
      conditions.push("((questions.status='published' AND questions.visibility='public_after_review') OR questions.submitted_by_user_id=? OR questions.visibility='team_only')");
    } else {
      conditions.push("((questions.status='published' AND questions.visibility='public_after_review') OR questions.submitted_by_user_id=?)");
    }
    bindings.push(viewer.id);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const questionResult = await env.DB.prepare(`
    SELECT questions.id, questions.tool, questions.request_type, questions.is_pinned,
      questions.author_name, questions.author_type, questions.visibility,
      questions.title, questions.body, questions.status,
      questions.source, questions.created_at, questions.updated_at, questions.published_at,
      users.display_name AS submitter_name, users.institution AS submitter_institution,
      identities.normalized_email AS submitter_email
    FROM qa_questions questions
    LEFT JOIN users ON users.id=questions.submitted_by_user_id
    LEFT JOIN user_identities identities ON identities.user_id=users.id AND identities.is_primary=1
    ${where}
    ORDER BY questions.is_pinned DESC, COALESCE(questions.published_at, questions.created_at) DESC
    LIMIT 500
  `).bind(...bindings).all();
  const questions = questionResult.results.map(questionFromRow);
  if (!questions.length) return questions;
  const placeholders = questions.map(() => "?").join(",");
  const answerResult = await env.DB.prepare(`
    SELECT id, question_id, body, response_type, author_name, parent_answer_id, message_type,
      sort_order, source_ref, created_at, updated_at
    FROM qa_answers WHERE question_id IN (${placeholders})
    ORDER BY sort_order ASC, created_at ASC
  `).bind(...questions.map((question) => question.id)).all();
  const byId = new Map(questions.map((question) => [question.id, question]));
  for (const answer of answerResult.results) {
    byId.get(answer.question_id)?.answers.push({
      id: answer.id,
      body: answer.body,
      responseType: answer.response_type,
      authorName: answer.author_name || null,
      parentAnswerId: answer.parent_answer_id || null,
      messageType: answer.message_type || "response",
      editable: !answer.source_ref,
      createdAt: answer.created_at,
      updatedAt: answer.updated_at,
      attachments: [],
    });
  }
  const attachmentResult = await env.DB.prepare(`
    SELECT id, question_id, answer_id, file_name, content_type, size_bytes, created_at
    FROM qa_attachments WHERE question_id IN (${placeholders})
    ORDER BY created_at ASC
  `).bind(...questions.map((question) => question.id)).all();
  for (const attachment of attachmentResult.results) {
    const question = byId.get(attachment.question_id);
    if (!question) continue;
    const publicAttachment = attachmentFromRow(attachment);
    if (attachment.answer_id) {
      question.answers.find((answer) => answer.id === attachment.answer_id)?.attachments.push(publicAttachment);
    } else {
      question.attachments.push(publicAttachment);
    }
  }
  return questions;
}

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
  const headerLabel = options.headerLabel || "User Portal Update";
  const paragraphs = announcement.body.split(/\n{2,}/).map((paragraph) => `<p style="margin:0 0 18px;line-height:1.65">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`).join("");
  const previewBanner = preview ? `<tr><td style="background:#e8f3fa;border-bottom:1px solid #c8ddea;padding:10px 36px;color:#285a78;font-size:12px;font-weight:700;letter-spacing:.08em;text-align:center;text-transform:uppercase">Preview · Sent only to the portal administrator</td></tr>` : "";
  const unsubscribe = includeUnsubscribe ? `<br><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#44647c;text-decoration:underline">Unsubscribe from announcement emails</a>` : "";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(announcement.title)}</title></head><body style="margin:0;padding:0;background:#edf3f7;color:#172b3a;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(announcement.body.slice(0, 140))}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf3f7"><tr><td align="center" style="padding:32px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#ffffff;border:1px solid #c9d7e2"><tr><td style="background:#123f63;border-bottom:5px solid #2ba8df;padding:25px 36px"><a href="https://ncidose.github.io/" style="color:#ffffff;font-size:24px;font-weight:400;letter-spacing:.01em;text-decoration:none">NCI Dose Tools</a><div style="margin-top:7px;color:#c9e5f4;font-size:11px;letter-spacing:.16em;text-transform:uppercase">${escapeHtml(headerLabel)}</div></td></tr>${previewBanner}<tr><td style="padding:38px 36px 20px"><span style="display:inline-block;background:#e9f5fb;color:#126b9a;font-size:11px;font-weight:700;letter-spacing:.12em;padding:7px 10px;text-transform:uppercase">${escapeHtml(announcement.category)}</span><h1 style="color:#143047;font-size:30px;font-weight:400;line-height:1.25;margin:18px 0 27px">${escapeHtml(announcement.title)}</h1><div style="color:#2c4050;font-size:16px;line-height:1.65">${paragraphs}</div><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0 12px"><tr><td style="background:#147da8"><a href="https://portal.ncidosetools.com" style="display:inline-block;color:#ffffff;font-size:15px;font-weight:700;padding:14px 22px;text-decoration:none">Open NCI Dose Tools User Portal</a></td></tr></table></td></tr><tr><td style="padding:8px 36px 34px"><div style="border-top:1px solid #d8e2ea;padding-top:22px;color:#2b4355;font-size:14px;line-height:1.6">Sincerely,<br><strong>NCI Dose Team</strong><br><a href="https://ncidose.github.io/" style="color:#2b4355;text-decoration:underline">NCI Dose Tools portal</a><br><span style="color:#627688">National Cancer Institute</span></div></td></tr><tr><td style="background:#f4f7f9;border-top:1px solid #d8e2ea;padding:20px 36px;color:#607486;font-size:11px;line-height:1.6">This message was sent to an email linked to an approved NCI Dose Tools User Portal account.${unsubscribe}</td></tr></table></td></tr></table></body></html>`;
};

export const welcomeEmailHtml = (displayName, email) => announcementEmailHtml({
  title: "Welcome to the NCI Dose Tools User Portal",
  category: "Approved access",
  body: `Hello ${displayName || "NCI Dose Tools user"},\n\nYour approved access to the NCI Dose Tools User Portal is ready.\n\nSign in using ${email}. A one-time verification code will be sent to that address.\n\nUse the User Portal to download approved software releases, review announcements, and manage your account email.`,
}, { includeUnsubscribe: false, headerLabel: "Approved User Access" });

export const secondaryEmailAddedHtml = (displayName, email) => announcementEmailHtml({
  title: "Secondary email added to your NCI Dose Tools account",
  category: "Account update",
  body: `Hello ${displayName || "NCI Dose Tools user"},\n\n${email} has been successfully linked to your approved NCI Dose Tools User Portal account.\n\nTo verify this address, sign out of the portal and sign in again using ${email}. The NCI Dose Tools User Portal will send a one-time verification code to this address. After verification, you can sign in with either email.\n\nIf you did not make this change, please contact the NCI Dose Team.`,
}, { includeUnsubscribe: false, headerLabel: "Account Confirmation" });

export const loginCodeEmailHtml = (code) => announcementEmailHtml({
  title: "Your NCI Dose Tools sign-in code",
  category: "Secure sign-in",
  body: `Enter this one-time code in the NCI Dose Tools User Portal:\n\n${code}\n\nThis code expires in ${loginCodeLifetimeMinutes} minutes and can be used only once. If you did not request this code, you can ignore this message.`,
}, { includeUnsubscribe: false, headerLabel: "Secure User Portal" });

async function sendPortalAccountEmail(env, { to, subject, html, text }) {
  const result = await resendRequest(env, "/emails", {
    method: "POST",
    body: JSON.stringify({ from: env.RESEND_FROM, to: [to], subject, html, text }),
  });
  return { status: "sent", sentTo: to, providerEmailId: result.id || null };
}

const welcomeEmailText = (displayName, email) => `Hello ${displayName || "NCI Dose Tools user"},\n\nYour approved access to the NCI Dose Tools User Portal is ready.\n\nSign in using ${email}. A one-time verification code will be sent to that address.\n\nOpen User Portal: https://portal.ncidosetools.com\n\nSincerely,\nNCI Dose Team\nNCI Dose Tools portal: https://ncidose.github.io/\nNational Cancer Institute`;

const secondaryEmailAddedText = (displayName, email) => `Hello ${displayName || "NCI Dose Tools user"},\n\n${email} has been successfully linked to your approved NCI Dose Tools User Portal account.\n\nTo verify this address, sign out and sign in again using ${email}. After verification, you can sign in with either email.\n\nIf you did not make this change, please contact the NCI Dose Team.\n\nOpen User Portal: https://portal.ncidosetools.com\n\nSincerely,\nNCI Dose Team\nNCI Dose Tools portal: https://ncidose.github.io/\nNational Cancer Institute`;

const loginCodeEmailText = (code) => `Your NCI Dose Tools sign-in code is ${code}.\n\nThis code expires in ${loginCodeLifetimeMinutes} minutes and can be used only once. If you did not request this code, you can ignore this message.\n\nOpen User Portal: https://portal.ncidosetools.com\n\nNCI Dose Team\nNational Cancer Institute`;

async function requestLoginCode(request, env, context, cors) {
  const url = new URL(request.url);
  const originError = requireSameOrigin(request, url, cors);
  if (originError) return originError;
  if (!env.AUTH_SECRET || !env.RESEND_API_KEY || !env.RESEND_FROM) return json({ error: "email_authentication_unavailable" }, 503, cors);
  const input = await request.json().catch(() => ({}));
  const email = normalizePortalEmail(input.email);
  if (!email) return json({ error: "valid_email_required" }, 400, cors);

  const requestIp = request.headers.get("cf-connecting-ip") || "unknown";
  const requestIpHash = await keyedHash(`ip:${requestIp}`, env.AUTH_SECRET);
  const [emailCount, ipCount] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS total FROM login_challenges WHERE normalized_email=? AND created_at >= datetime('now', '-1 hour')").bind(email).first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM login_challenges WHERE request_ip_hash=? AND created_at >= datetime('now', '-1 hour')").bind(requestIpHash).first(),
  ]);
  if (Number(emailCount.total) >= 5 || Number(ipCount.total) >= 20) {
    return json({ error: "too_many_code_requests", retryAfter: 3600 }, 429, { ...cors, "retry-after": "3600" });
  }

  const identity = await env.DB.prepare(`
    SELECT identities.id AS identity_id, identities.user_id, users.display_name
    FROM user_identities identities
    JOIN users ON users.id=identities.user_id
    WHERE identities.normalized_email=? AND users.access_status='active'
  `).bind(email).first();
  const challengeId = crypto.randomUUID();
  const code = identity ? generateLoginCode() : "";
  const codeHash = identity ? await keyedHash(`code:${challengeId}:${email}:${code}`, env.AUTH_SECRET) : null;
  await env.DB.batch([
    env.DB.prepare("UPDATE login_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE normalized_email=? AND consumed_at IS NULL").bind(email),
    env.DB.prepare(`
      INSERT INTO login_challenges (
        id, normalized_email, user_id, identity_id, code_hash, request_ip_hash, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+${loginCodeLifetimeMinutes} minutes'))
    `).bind(challengeId, email, identity?.user_id || null, identity?.identity_id || null, codeHash, requestIpHash),
  ]);

  if (identity) {
    try {
      await sendPortalAccountEmail(env, {
        to: email,
        subject: `${code} is your NCI Dose Tools sign-in code`,
        html: loginCodeEmailHtml(code),
        text: loginCodeEmailText(code),
      });
      context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'login_code_sent', ?)").bind(
        crypto.randomUUID(), identity.user_id, JSON.stringify({ email }),
      ).run());
    } catch (error) {
      await env.DB.prepare("UPDATE login_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE id=?").bind(challengeId).run();
      return json({ error: "login_code_delivery_failed" }, 502, cors);
    }
  }

  context.waitUntil(env.DB.prepare("DELETE FROM login_challenges WHERE created_at < datetime('now', '-1 day')").run());
  return json({ challengeId, expiresIn: loginCodeLifetimeMinutes * 60 }, 200, cors);
}

async function verifyLoginCode(request, env, context, cors) {
  const url = new URL(request.url);
  const originError = requireSameOrigin(request, url, cors);
  if (originError) return originError;
  if (!env.AUTH_SECRET) return json({ error: "email_authentication_unavailable" }, 503, cors);
  const input = await request.json().catch(() => ({}));
  const challengeId = cleanText(input.challengeId, 80);
  const code = cleanText(input.code, 12);
  if (!/^[0-9]{6}$/.test(code) || !challengeId) return json({ error: "six_digit_code_required" }, 400, cors);

  const challenge = await env.DB.prepare(`
    SELECT challenges.*, users.access_status
    FROM login_challenges challenges
    LEFT JOIN users ON users.id=challenges.user_id
    WHERE challenges.id=?
  `).bind(challengeId).first();
  if (!challenge || !challenge.code_hash || !challenge.user_id || !challenge.identity_id) {
    return json({ error: "invalid_or_expired_code" }, 400, cors);
  }
  if (challenge.consumed_at || challenge.attempts_remaining <= 0 || challenge.expires_at <= new Date().toISOString().replace("T", " ").slice(0, 19)) {
    return json({ error: "invalid_or_expired_code" }, 410, cors);
  }
  if (challenge.access_status !== "active") return json({ error: "portal_access_denied" }, 403, cors);

  const submittedHash = await keyedHash(`code:${challenge.id}:${challenge.normalized_email}:${code}`, env.AUTH_SECRET);
  if (!constantTimeEqual(submittedHash, challenge.code_hash)) {
    await env.DB.prepare(`
      UPDATE login_challenges
      SET attempts_remaining=attempts_remaining-1,
        consumed_at=CASE WHEN attempts_remaining <= 1 THEN CURRENT_TIMESTAMP ELSE consumed_at END
      WHERE id=? AND consumed_at IS NULL
    `).bind(challenge.id).run();
    return json({ error: "invalid_or_expired_code" }, 400, cors);
  }

  const sessionId = crypto.randomUUID();
  const sessionToken = randomToken();
  const tokenHash = await keyedHash(`session:${sessionToken}`, env.AUTH_SECRET);
  await env.DB.batch([
    env.DB.prepare("UPDATE login_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE id=? AND consumed_at IS NULL").bind(challenge.id),
    env.DB.prepare("UPDATE user_identities SET email_verified=1, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(challenge.identity_id),
    env.DB.prepare(`
      INSERT INTO portal_sessions (id, user_id, identity_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?, datetime('now', '+${portalSessionLifetimeDays} days'))
    `).bind(sessionId, challenge.user_id, challenge.identity_id, tokenHash),
  ]);
  const user = await userForEmail(challenge.normalized_email, env);
  const identities = await identitiesForUser(user.id, env);
  const primaryEmail = identities.find((identity) => identity.primary)?.email || challenge.normalized_email;
  context.waitUntil(Promise.all([
    env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'login', ?)").bind(
      crypto.randomUUID(), user.id, JSON.stringify({ email: challenge.normalized_email, method: "email_otp" }),
    ).run(),
    env.DB.prepare("DELETE FROM portal_sessions WHERE expires_at <= CURRENT_TIMESTAMP OR revoked_at < datetime('now', '-1 day')").run(),
  ]));
  const headers = new Headers(cors);
  headers.append("set-cookie", portalSessionCookieHeader(sessionToken));
  return json({ user: { ...user, primary_email: primaryEmail, identities } }, 200, headers);
}

async function logoutPortalSession(request, env, cors) {
  const url = new URL(request.url);
  const originError = requireSameOrigin(request, url, cors);
  if (originError) return originError;
  const token = cookieValue(request, portalSessionCookie);
  if (token && env.AUTH_SECRET) {
    const tokenHash = await keyedHash(`session:${token}`, env.AUTH_SECRET);
    await env.DB.prepare("UPDATE portal_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?").bind(tokenHash).run();
  }
  const headers = new Headers(cors);
  headers.append("set-cookie", portalSessionCookieHeader("", 0));
  return new Response(null, { status: 204, headers });
}

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

async function attachmentRecord(env, id) {
  return env.DB.prepare(`
    SELECT attachments.*, questions.status, questions.visibility, questions.submitted_by_user_id
    FROM qa_attachments attachments
    JOIN qa_questions questions ON questions.id=attachments.question_id
    WHERE attachments.id=?
  `).bind(id).first();
}

async function attachmentResponse(env, attachment) {
  const object = await env.BUCKET.get(attachment.object_key);
  if (!object) return new Response("Attachment not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": attachment.content_type || "application/octet-stream",
      "content-length": String(attachment.size_bytes),
      "content-disposition": attachmentDisposition(attachment.file_name),
      "x-content-type-options": "nosniff",
      "cache-control": attachment.status === "published" ? "public, max-age=3600" : "private, no-store",
    },
  });
}

async function storeQaAttachment(request, env, { question, answerId = null, userId }) {
  const form = await request.formData();
  const file = form.get("file");
  const validationError = qaAttachmentValidationError(file);
  if (validationError) return { error: validationError };
  const count = await env.DB.prepare(`
    SELECT COUNT(*) AS total FROM qa_attachments
    WHERE question_id=? AND ${answerId ? "answer_id=?" : "answer_id IS NULL"}
  `).bind(...(answerId ? [question.id, answerId] : [question.id])).first();
  if (Number(count.total) >= qaAttachmentMaximumCount) return { error: "attachment_limit_reached" };
  const id = crypto.randomUUID();
  const fileName = safeAttachmentName(file.name);
  const objectKey = `qa-attachments/${question.id}/${id}-${fileName}`;
  await env.BUCKET.put(objectKey, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { questionId: question.id, answerId: answerId || "", uploadedBy: userId },
  });
  try {
    await env.DB.prepare(`
      INSERT INTO qa_attachments (id, question_id, answer_id, uploaded_by_user_id, object_key, file_name, content_type, size_bytes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, question.id, answerId, userId, objectKey, fileName, file.type, file.size).run();
  } catch (error) {
    await env.BUCKET.delete(objectKey);
    throw error;
  }
  return { attachment: { id, fileName, contentType: file.type, sizeBytes: file.size, createdAt: new Date().toISOString() } };
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "ncidose-portal-api" }, 200, cors);
    if (request.method === "POST" && url.pathname === "/api/auth/request-code") {
      return requestLoginCode(request, env, context, cors);
    }
    if (request.method === "POST" && url.pathname === "/api/auth/verify-code") {
      return verifyLoginCode(request, env, context, cors);
    }
    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      return logoutPortalSession(request, env, cors);
    }
    if (request.method === "GET" && url.pathname === "/api/public/questions") {
      const questions = (await loadQuestions(env, { publicOnly: true })).map(({ status, source, submitter, ...question }) => ({
        ...question,
        answers: question.answers.map(({ editable, ...answer }) => answer),
      }));
      return Response.json({ questions }, {
        headers: {
          ...cors,
          "cache-control": "public, max-age=30, s-maxage=30, stale-while-revalidate=120",
        },
      });
    }
    const publicAttachmentMatch = url.pathname.match(/^\/api\/public\/attachments\/([0-9a-f-]+)$/i);
    if (request.method === "GET" && publicAttachmentMatch) {
      const attachment = await attachmentRecord(env, publicAttachmentMatch[1]);
      if (!attachment || attachment.status !== "published") return new Response("Attachment not found", { status: 404 });
      return attachmentResponse(env, attachment);
    }
    // The public shell contains only the sign-in UI. Every API and download route
    // below requires either a portal session or (during migration) Cloudflare Access.
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

      const attachmentMatch = url.pathname.match(/^\/api\/attachments\/([0-9a-f-]+)$/i);
      if (request.method === "GET" && attachmentMatch) {
        const attachment = await attachmentRecord(env, attachmentMatch[1]);
        if (!attachment || !canViewDiscussion(attachment, user)) {
          return new Response("Attachment not found", { status: 404, headers: cors });
        }
        return attachmentResponse(env, attachment);
      }
      if (request.method === "DELETE" && attachmentMatch) {
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const attachment = await attachmentRecord(env, attachmentMatch[1]);
        if (!attachment || (user.role !== "admin" && (attachment.submitted_by_user_id !== user.id || attachment.status === "published"))) {
          return json({ error: "attachment_not_found" }, 404, cors);
        }
        await env.BUCKET.delete(attachment.object_key);
        await env.DB.prepare("DELETE FROM qa_attachments WHERE id=?").bind(attachment.id).run();
        return new Response(null, { status: 204, headers: cors });
      }

      if (request.method === "GET" && url.pathname === "/api/questions") {
        return json({ questions: await loadQuestions(env, { viewer: user }) }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/api/questions") {
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const input = await request.json();
        const requestType = qaRequestTypes.has(input.requestType) ? input.requestType : "technical_question";
        const tool = requestType === "feature_request" ? "General" : (questionTools.has(input.tool) ? input.tool : "General");
        const visibility = normalizeQuestionVisibility(input.visibility);
        const title = cleanText(input.title, 240);
        const body = cleanText(input.body, 12000);
        if (!title || !body) return json({ error: "title_and_question_required" }, 400, cors);
        const id = crypto.randomUUID();
        const author = discussionAuthorForUser(user);
        const status = visibility === "team_only" ? "submitted" : "published";
        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO qa_questions (id, tool, request_type, author_name, author_type, visibility, title, body, status, source, submitted_by_user_id, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'portal', ?, CASE WHEN ?='published' THEN CURRENT_TIMESTAMP ELSE NULL END)
          `).bind(id, tool, requestType, author.name, author.type, visibility, title, body, status, user.id, status),
          env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'question_submitted', ?)")
            .bind(crypto.randomUUID(), user.id, JSON.stringify({ questionId: id, tool, visibility })),
        ]);
        if (env.RESEND_API_KEY && env.RESEND_FROM) {
          const administrators = await env.DB.prepare(`
            SELECT identities.normalized_email AS email
            FROM users JOIN user_identities identities ON identities.user_id=users.id AND identities.is_primary=1
            WHERE users.role='admin' AND users.access_status='active'
          `).all();
          for (const administrator of administrators.results) {
            context.waitUntil(sendPortalAccountEmail(env, {
              to: administrator.email,
              subject: `New NCI Dose Tools ${qaRequestTypeLabel(requestType).toLowerCase()}: ${title}`,
              html: announcementEmailHtml({ title: `A new ${qaRequestTypeLabel(requestType).toLowerCase()} was posted`, category: requestType === "feature_request" ? "Feature request" : tool, body: `${title}\n\nVisibility: ${visibility === "team_only" ? "NCI Dose Team only" : "Public discussion"}\n\nReview it in Portal administration > Discussions.` }, { includeUnsubscribe: false, headerLabel: "Community Discussions" }),
              text: `A new ${qaRequestTypeLabel(requestType).toLowerCase()} was posted:\n\n${title}\n\nVisibility: ${visibility === "team_only" ? "NCI Dose Team only" : "Public discussion"}\n\nReview it in Portal administration > Discussions:\nhttps://portal.ncidosetools.com/#/portal/admin`,
            }).catch(() => undefined));
          }
        }
        const created = (await loadQuestions(env, { viewer: user })).find((question) => question.id === id);
        return json({ question: created }, 201, cors);
      }

      const questionAttachmentMatch = url.pathname.match(/^\/api\/questions\/([0-9a-f-]+)\/attachments$/i);
      if (request.method === "POST" && questionAttachmentMatch) {
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const question = await env.DB.prepare("SELECT id, submitted_by_user_id, status FROM qa_questions WHERE id=?").bind(questionAttachmentMatch[1]).first();
        if (!question || question.submitted_by_user_id !== user.id || !["submitted", "draft", "published"].includes(question.status)) {
          return json({ error: "question_not_available_for_attachment" }, 404, cors);
        }
        const result = await storeQaAttachment(request, env, { question, userId: user.id });
        return result.error ? json({ error: result.error }, result.error === "attachment_limit_reached" ? 409 : 400, cors) : json(result, 201, cors);
      }

      const discussionReplyMatch = url.pathname.match(/^\/api\/questions\/([0-9a-z-]+)\/replies$/i);
      if (request.method === "POST" && discussionReplyMatch) {
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const question = await env.DB.prepare("SELECT * FROM qa_questions WHERE id=?").bind(discussionReplyMatch[1]).first();
        if (!canViewDiscussion(question, user) || question.status === "archived") return json({ error: "discussion_not_available" }, 404, cors);
        const input = await request.json();
        const body = cleanText(input.body, 20000);
        if (!body) return json({ error: "reply_required" }, 400, cors);
        const parentAnswerId = cleanText(input.parentAnswerId, 100) || null;
        let parentAuthorId = null;
        if (parentAnswerId) {
          const parent = await env.DB.prepare("SELECT id, created_by_user_id FROM qa_answers WHERE id=? AND question_id=?").bind(parentAnswerId, question.id).first();
          if (!parent) return json({ error: "parent_reply_not_found" }, 404, cors);
          parentAuthorId = parent.created_by_user_id || null;
        }
        const author = discussionAuthorForUser(user);
        const answerId = crypto.randomUUID();
        const order = await env.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM qa_answers WHERE question_id=?").bind(question.id).first();
        const messageType = parentAnswerId || author.type === "community" ? "follow_up" : "response";
        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO qa_answers (id, question_id, body, response_type, author_name, parent_answer_id, message_type, sort_order, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(answerId, question.id, body, author.type, author.name, parentAnswerId, messageType, Number(order.next_order || 0), user.id),
          env.DB.prepare("UPDATE qa_questions SET updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(question.id),
          env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'discussion_reply_added', ?)")
            .bind(crypto.randomUUID(), user.id, JSON.stringify({ questionId: question.id, answerId, parentAnswerId })),
        ]);
        if (env.RESEND_API_KEY && env.RESEND_FROM) {
          const recipients = await env.DB.prepare(`
            SELECT DISTINCT identities.normalized_email AS email
            FROM users
            JOIN user_identities identities ON identities.user_id=users.id AND identities.is_primary=1
            WHERE users.access_status='active' AND users.id<>?
              AND (
                users.id=? OR users.id=?
                OR (?='community' AND (users.role='admin' OR users.discussion_role='team'))
              )
          `).bind(user.id, question.submitted_by_user_id || "", parentAuthorId || "", author.type).all();
          for (const recipient of recipients.results) {
            context.waitUntil(sendPortalAccountEmail(env, {
              to: recipient.email,
              subject: `New reply: ${question.title}`,
              html: announcementEmailHtml({ title: "A discussion has a new reply", category: qaRequestTypeLabel(question.request_type), body: `${author.name} replied to “${question.title}.”\n\nOpen the discussion in the approved User Portal to read and respond.` }, { includeUnsubscribe: false, headerLabel: "Community Discussions" }),
              text: `${author.name} replied to “${question.title}.”\n\nOpen the discussion: https://portal.ncidosetools.com/#/portal/questions?discussion=${question.id}\n\nNCI Dose Team\nNational Cancer Institute`,
            }).catch(() => undefined));
          }
        }
        const updated = (await loadQuestions(env, { viewer: user })).find((entry) => entry.id === question.id);
        return json({ question: updated, answer: updated?.answers.find((answer) => answer.id === answerId) }, 201, cors);
      }

      const discussionReplyAttachmentMatch = url.pathname.match(/^\/api\/questions\/([0-9a-z-]+)\/replies\/([0-9a-f-]+)\/attachments$/i);
      if (request.method === "POST" && discussionReplyAttachmentMatch) {
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const question = await env.DB.prepare("SELECT * FROM qa_questions WHERE id=?").bind(discussionReplyAttachmentMatch[1]).first();
        if (!canViewDiscussion(question, user) || question.status === "archived") return json({ error: "discussion_not_available" }, 404, cors);
        const answer = await env.DB.prepare("SELECT id, created_by_user_id FROM qa_answers WHERE id=? AND question_id=?").bind(discussionReplyAttachmentMatch[2], question.id).first();
        if (!answer || answer.created_by_user_id !== user.id) return json({ error: "reply_not_available_for_attachment" }, 404, cors);
        const result = await storeQaAttachment(request, env, { question, answerId: answer.id, userId: user.id });
        return result.error ? json({ error: result.error }, result.error === "attachment_limit_reached" ? 409 : 400, cors) : json(result, 201, cors);
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
        let confirmationEmail = { status: "not_configured", sentTo: newEmail };
        if (env.RESEND_API_KEY && env.RESEND_SEGMENT_ID && env.RESEND_FROM) {
          try {
            confirmationEmail = await sendPortalAccountEmail(env, {
              to: newEmail,
              subject: "Secondary email added to your NCI Dose Tools account",
              html: secondaryEmailAddedHtml(user.display_name, newEmail),
              text: secondaryEmailAddedText(user.display_name, newEmail),
            });
          } catch (error) {
            confirmationEmail = { status: "failed", sentTo: newEmail, error: String(error.message || error) };
          }
        }
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, ?, ?)").bind(
          crypto.randomUUID(),
          user.id,
          confirmationEmail.status === "sent" ? "secondary_email_notice_sent" : "secondary_email_notice_failed",
          JSON.stringify({ email: newEmail, status: confirmationEmail.status }),
        ).run());
        return json({ identity: { id, provider: "user_added", email: newEmail, verified: false, primary: false }, confirmationEmail }, 201, cors);
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

      const primaryEmailMatch = url.pathname.match(/^\/api\/account\/emails\/([0-9a-f-]+)\/primary$/i);
      if (request.method === "PATCH" && primaryEmailMatch) {
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const identity = await env.DB.prepare(`
          SELECT id, normalized_email, email_verified, is_primary
          FROM user_identities
          WHERE id=? AND user_id=?
        `).bind(primaryEmailMatch[1], user.id).first();
        if (!identity) return json({ error: "email_not_found" }, 404, cors);
        if (!identity.email_verified) return json({ error: "email_verification_required" }, 409, cors);

        const previousPrimary = await env.DB.prepare(`
          SELECT normalized_email FROM user_identities WHERE user_id=? AND is_primary=1
        `).bind(user.id).first();
        if (!identity.is_primary) {
          await env.DB.batch([
            env.DB.prepare("UPDATE user_identities SET is_primary=0, updated_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(user.id),
            env.DB.prepare("UPDATE user_identities SET is_primary=1, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?").bind(identity.id, user.id),
          ]);
          context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'primary_email_changed', ?)").bind(
            crypto.randomUUID(), user.id, JSON.stringify({ from: previousPrimary?.normalized_email || null, to: identity.normalized_email }),
          ).run());
          if (env.RESEND_API_KEY && env.RESEND_SEGMENT_ID) {
            context.waitUntil(Promise.allSettled([
              addResendContactToAudience(env, identity.normalized_email),
              previousPrimary?.normalized_email && previousPrimary.normalized_email !== identity.normalized_email
                ? removeResendContactFromAudience(env, previousPrimary.normalized_email)
                : Promise.resolve(),
            ]));
          }
        }
        const identities = await identitiesForUser(user.id, env);
        return json({ primaryEmail: identity.normalized_email, identities }, 200, cors);
      }

      const accountEmailMatch = url.pathname.match(/^\/api\/account\/emails\/([0-9a-f-]+)$/i);
      if (request.method === "DELETE" && accountEmailMatch) {
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const identity = await env.DB.prepare("SELECT id, normalized_email, is_primary FROM user_identities WHERE id=? AND user_id=?").bind(accountEmailMatch[1], user.id).first();
        if (!identity) return json({ error: "email_not_found" }, 404, cors);
        if (identity.is_primary) return json({ error: "primary_email_cannot_be_removed" }, 409, cors);
        await env.DB.batch([
          env.DB.prepare("DELETE FROM portal_sessions WHERE identity_id=? AND user_id=?").bind(identity.id, user.id),
          env.DB.prepare("DELETE FROM login_challenges WHERE identity_id=? AND user_id=?").bind(identity.id, user.id),
          env.DB.prepare("DELETE FROM user_identities WHERE id=? AND user_id=?").bind(identity.id, user.id),
        ]);
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'email_removed', ?)").bind(crypto.randomUUID(), user.id, JSON.stringify({ email: identity.normalized_email })).run());
        return new Response(null, { status: 204, headers: cors });
      }

      if (request.method === "GET" && url.pathname === "/api/admin/users") {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const [usersResult, identitiesResult] = await Promise.all([
          env.DB.prepare(`
            SELECT users.id, users.display_name, users.institution, users.country, users.role,
              users.discussion_role, users.discussion_handle, users.sta_status,
              users.access_status, users.approval_source, users.approved_at, users.group_joined_at, users.created_at,
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
            discussionRole: entry.role === "admin" ? "team" : entry.discussion_role,
            discussionHandle: entry.discussion_handle,
            staStatus: entry.sta_status,
            accessStatus: entry.access_status,
            approvalSource: entry.approval_source,
            approvedAt: entry.approved_at,
            groupJoinedAt: entry.group_joined_at,
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
        let welcomeEmail = { status: "not_configured", sentTo: approvedEmail };
        if (env.RESEND_API_KEY && env.RESEND_SEGMENT_ID && env.RESEND_FROM) {
          const [audienceResult, emailResult] = await Promise.allSettled([
            addResendContactToAudience(env, approvedEmail),
            sendPortalAccountEmail(env, {
              to: approvedEmail,
              subject: "Welcome to the NCI Dose Tools User Portal",
              html: welcomeEmailHtml(displayName, approvedEmail),
              text: welcomeEmailText(displayName, approvedEmail),
            }),
          ]);
          welcomeEmail = emailResult.status === "fulfilled"
            ? emailResult.value
            : { status: "failed", sentTo: approvedEmail, error: String(emailResult.reason?.message || emailResult.reason) };
          if (audienceResult.status === "rejected") {
            context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, 'email_audience_sync_failed', ?)").bind(
              crypto.randomUUID(), userId, JSON.stringify({ email: approvedEmail }),
            ).run());
          }
        }
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, ?, ?)").bind(
          crypto.randomUUID(),
          userId,
          welcomeEmail.status === "sent" ? "welcome_email_sent" : "welcome_email_failed",
          JSON.stringify({ email: approvedEmail, status: welcomeEmail.status }),
        ).run());
        return json({
          user: {
            id: userId,
            name: displayName,
            institution: institution || null,
            country: country || null,
            role: "user",
            discussionRole: "community",
            discussionHandle: null,
            staStatus: "approved",
            accessStatus: "active",
            approvalSource: "sta_admin",
            approvedAt,
            groupJoinedAt: null,
            createdAt: new Date().toISOString(),
            lastLoginAt: null,
            identities: [{ id: identityId, provider: "sta_approved", email: approvedEmail, verified: false, primary: true }],
          },
          welcomeEmail,
        }, 201, cors);
      }

      const adminUserMatch = url.pathname.match(/^\/api\/admin\/users\/([0-9a-z_-]+)$/i);
      if (request.method === "PATCH" && adminUserMatch) {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const input = await request.json();
        const accessStatus = input.accessStatus === undefined ? null : input.accessStatus === "active" ? "active" : input.accessStatus === "suspended" ? "suspended" : "";
        const nextDiscussionRole = input.discussionRole === undefined ? null : input.discussionRole === "team" ? "team" : input.discussionRole === "community" ? "community" : "";
        if (accessStatus === "" || nextDiscussionRole === "") return json({ error: "valid_user_update_required" }, 400, cors);
        if (!accessStatus && !nextDiscussionRole) return json({ error: "user_update_required" }, 400, cors);
        if (adminUserMatch[1] === user.id && accessStatus === "suspended") return json({ error: "cannot_suspend_current_admin" }, 409, cors);
        const existing = await env.DB.prepare(`
          SELECT users.id, users.display_name, users.role, users.access_status, users.discussion_role,
            users.discussion_handle, identities.normalized_email AS primary_email
          FROM users
          LEFT JOIN user_identities identities ON identities.user_id=users.id AND identities.is_primary=1
          WHERE users.id=?
        `).bind(adminUserMatch[1]).first();
        if (!existing) return json({ error: "user_not_found" }, 404, cors);
        const statements = [];
        if (accessStatus) statements.push(env.DB.prepare("UPDATE users SET access_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(accessStatus, adminUserMatch[1]));
        let nextHandle = existing.discussion_handle || null;
        if (nextDiscussionRole) {
          nextHandle = nextDiscussionRole === "team"
            ? discussionHandle(input.discussionHandle, existing.discussion_handle || existing.display_name || String(existing.primary_email || "").split("@")[0])
            : existing.discussion_handle;
          const nextAuthorName = nextDiscussionRole === "team"
            ? `@${nextHandle}`
            : cleanText(existing.display_name, 200) || `@${discussionHandle(null, String(existing.primary_email || "").split("@")[0])}`;
          statements.push(env.DB.prepare("UPDATE users SET discussion_role=?, discussion_handle=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(nextDiscussionRole, nextHandle, adminUserMatch[1]));
          statements.push(env.DB.prepare("UPDATE qa_questions SET author_type=?, author_name=?, updated_at=CURRENT_TIMESTAMP WHERE submitted_by_user_id=?").bind(nextDiscussionRole === "team" ? "team" : "community", nextAuthorName, adminUserMatch[1]));
          statements.push(env.DB.prepare("UPDATE qa_answers SET response_type=?, author_name=?, updated_at=CURRENT_TIMESTAMP WHERE created_by_user_id=?").bind(nextDiscussionRole === "team" ? "team" : "community", nextAuthorName, adminUserMatch[1]));
        }
        if (accessStatus === "suspended") {
          statements.push(env.DB.prepare("UPDATE portal_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL").bind(adminUserMatch[1]));
        }
        await env.DB.batch(statements);
        context.waitUntil(env.DB.prepare("INSERT INTO access_events (id, user_id, event_type, metadata_json) VALUES (?, ?, ?, ?)").bind(
          crypto.randomUUID(), adminUserMatch[1], nextDiscussionRole ? "discussion_role_changed" : "access_status_changed",
          JSON.stringify({ accessStatus, discussionRole: nextDiscussionRole, discussionHandle: nextHandle, changedBy: user.id }),
        ).run());
        if (accessStatus && existing.primary_email && env.RESEND_API_KEY && env.RESEND_SEGMENT_ID) {
          const syncContact = accessStatus === "active"
            ? addResendContactToAudience(env, existing.primary_email)
            : removeResendContactFromAudience(env, existing.primary_email);
          context.waitUntil(syncContact.catch(() => undefined));
        }
        return json({
          id: adminUserMatch[1],
          accessStatus: accessStatus || existing.access_status,
          discussionRole: existing.role === "admin" ? "team" : (nextDiscussionRole || existing.discussion_role),
          discussionHandle: nextHandle,
        }, 200, cors);
      }

      if (request.method === "DELETE" && adminUserMatch) {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        if (adminUserMatch[1] === user.id) return json({ error: "cannot_delete_current_admin" }, 409, cors);
        const existing = await env.DB.prepare(`
          SELECT id, role, access_status
          FROM users
          WHERE id=?
        `).bind(adminUserMatch[1]).first();
        if (!existing) return json({ error: "user_not_found" }, 404, cors);
        if (existing.role === "admin") return json({ error: "cannot_delete_admin" }, 409, cors);
        if (existing.access_status !== "suspended") return json({ error: "user_must_be_suspended" }, 409, cors);

        const identityResult = await env.DB.prepare(`
          SELECT normalized_email, is_primary
          FROM user_identities
          WHERE user_id=?
        `).bind(existing.id).all();
        const emails = identityResult.results.map((identity) => identity.normalized_email).filter(Boolean);
        const primaryEmail = identityResult.results.find((identity) => identity.is_primary)?.normalized_email || null;
        const deletionStatements = [
          env.DB.prepare("UPDATE access_requests SET activated_user_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE activated_user_id=?").bind(existing.id),
          env.DB.prepare("UPDATE announcements SET created_by_user_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE created_by_user_id=?").bind(existing.id),
          env.DB.prepare("UPDATE announcement_email_deliveries SET requested_by_user_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE requested_by_user_id=?").bind(existing.id),
          env.DB.prepare("UPDATE qa_questions SET submitted_by_user_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE submitted_by_user_id=?").bind(existing.id),
          env.DB.prepare("UPDATE qa_answers SET created_by_user_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE created_by_user_id=?").bind(existing.id),
          env.DB.prepare("DELETE FROM announcement_reads WHERE user_id=?").bind(existing.id),
          env.DB.prepare("UPDATE access_events SET user_id=NULL, metadata_json=NULL WHERE user_id=?").bind(existing.id),
          env.DB.prepare("DELETE FROM portal_sessions WHERE user_id=?").bind(existing.id),
          env.DB.prepare("DELETE FROM login_challenges WHERE user_id=?").bind(existing.id),
          env.DB.prepare("DELETE FROM user_identities WHERE user_id=?").bind(existing.id),
        ];
        if (emails.length > 0) {
          deletionStatements.push(env.DB.prepare(`DELETE FROM group_memberships WHERE normalized_email IN (${emails.map(() => "?").join(",")})`).bind(...emails));
        }
        deletionStatements.push(
          env.DB.prepare("DELETE FROM users WHERE id=?").bind(existing.id),
          env.DB.prepare("INSERT INTO access_events (id, event_type, metadata_json) VALUES (?, 'user_deleted', ?)").bind(
            crypto.randomUUID(), JSON.stringify({ deletedUserId: existing.id, deletedBy: user.id }),
          ),
        );
        await env.DB.batch(deletionStatements);
        if (primaryEmail && env.RESEND_API_KEY && env.RESEND_SEGMENT_ID) {
          context.waitUntil(removeResendContactFromAudience(env, primaryEmail).catch(() => undefined));
        }
        return new Response(null, { status: 204, headers: cors });
      }

      if (request.method === "GET" && url.pathname === "/api/admin/questions") {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        return json({ questions: await loadQuestions(env) }, 200, cors);
      }

      const adminQuestionMatch = url.pathname.match(/^\/api\/admin\/questions\/([0-9a-z-]+)$/i);
      if (request.method === "PATCH" && adminQuestionMatch) {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const existing = await env.DB.prepare("SELECT * FROM qa_questions WHERE id=?").bind(adminQuestionMatch[1]).first();
        if (!existing) return json({ error: "question_not_found" }, 404, cors);
        const input = await request.json();
        const requestType = input.requestType === undefined ? existing.request_type : (qaRequestTypes.has(input.requestType) ? input.requestType : "");
        const tool = requestType === "feature_request" ? "General" : (input.tool === undefined ? existing.tool : (questionTools.has(input.tool) ? input.tool : ""));
        const title = input.title === undefined ? existing.title : cleanText(input.title, 240);
        const body = input.body === undefined ? existing.body : cleanText(input.body, 12000);
        const status = input.status === undefined ? existing.status : (questionStatuses.has(input.status) ? input.status : "");
        const pinned = requestType === "feature_request" && (input.pinned === undefined ? Boolean(existing.is_pinned) : Boolean(input.pinned));
        if (!requestType || !tool || !title || !body || !status) return json({ error: "valid_question_fields_required" }, 400, cors);
        if (status === "published" && !canPublishQuestion(existing.visibility)) return json({ error: "team_only_question_cannot_be_published" }, 409, cors);
        if (status === "published") {
          const answerCount = await env.DB.prepare("SELECT COUNT(*) AS total FROM qa_answers WHERE question_id=?").bind(existing.id).first();
          if (!Number(answerCount.total)) return json({ error: "answer_required_before_publishing" }, 409, cors);
        }
        await env.DB.prepare(`
          UPDATE qa_questions SET tool=?, request_type=?, is_pinned=?, title=?, body=?, status=?,
            published_at=CASE WHEN ?='published' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE published_at END,
            updated_at=CURRENT_TIMESTAMP WHERE id=?
        `).bind(tool, requestType, pinned ? 1 : 0, title, body, status, status, existing.id).run();
        if (status === "published" && existing.status !== "published" && existing.submitted_by_user_id && env.RESEND_API_KEY && env.RESEND_FROM) {
          const submitter = await env.DB.prepare(`
            SELECT users.display_name AS name, identities.normalized_email AS email
            FROM users JOIN user_identities identities ON identities.user_id=users.id AND identities.is_primary=1
            WHERE users.id=?
          `).bind(existing.submitted_by_user_id).first();
          if (submitter?.email) {
            context.waitUntil(sendPortalAccountEmail(env, {
              to: submitter.email,
              subject: `NCI Dose Tools discussion published: ${title}`,
              html: announcementEmailHtml({ title: "Your discussion has been answered", category: tool, body: `Hello ${submitter.name || "NCI Dose Tools user"},\n\nThe NCI Dose Team has reviewed your discussion, “${title},” and published the response in Community Discussions.\n\nView the discussion: https://ncidose.github.io/#/discussions/${existing.id}` }, { includeUnsubscribe: false, headerLabel: "Community Discussions" }),
              text: `Your NCI Dose Tools discussion has been answered.\n\n${title}\n\nView the discussion: https://ncidose.github.io/#/discussions/${existing.id}\n\nNCI Dose Team\nNational Cancer Institute`,
            }).catch(() => undefined));
          }
        }
        const questions = await loadQuestions(env);
        return json({ question: questions.find((question) => question.id === existing.id) }, 200, cors);
      }

      const adminAnswerMatch = url.pathname.match(/^\/api\/admin\/questions\/([0-9a-z-]+)\/answer$/i);
      if (request.method === "PUT" && adminAnswerMatch) {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const question = await env.DB.prepare("SELECT id FROM qa_questions WHERE id=?").bind(adminAnswerMatch[1]).first();
        if (!question) return json({ error: "question_not_found" }, 404, cors);
        const input = await request.json();
        const body = cleanText(input.body, 20000);
        if (!body) return json({ error: "answer_required" }, 400, cors);
        const author = discussionAuthorForUser(user);
        const existing = await env.DB.prepare(`
          SELECT id FROM qa_answers
          WHERE question_id=? AND response_type='team' AND source_ref IS NULL
          ORDER BY created_at DESC LIMIT 1
        `).bind(question.id).first();
        if (existing) {
          await env.DB.prepare("UPDATE qa_answers SET body=?, response_type='team', author_name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body, author.name, existing.id).run();
        } else {
          const order = await env.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM qa_answers WHERE question_id=?").bind(question.id).first();
          await env.DB.prepare(`
            INSERT INTO qa_answers (id, question_id, body, response_type, author_name, parent_answer_id, message_type, sort_order, created_by_user_id)
            VALUES (?, ?, ?, 'team', ?, NULL, 'response', ?, ?)
          `).bind(crypto.randomUUID(), question.id, body, author.name, Number(order.next_order || 0), user.id).run();
        }
        await env.DB.prepare("UPDATE qa_questions SET updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(question.id).run();
        const questions = await loadQuestions(env);
        return json({ question: questions.find((entry) => entry.id === question.id) }, 200, cors);
      }

      const adminAnswerAttachmentMatch = url.pathname.match(/^\/api\/admin\/questions\/([0-9a-f-]+)\/answer-attachments$/i);
      if (request.method === "POST" && adminAnswerAttachmentMatch) {
        if (user.role !== "admin") return json({ error: "administrator_required" }, 403, cors);
        const originError = requireSameOrigin(request, url, cors);
        if (originError) return originError;
        const question = await env.DB.prepare("SELECT id FROM qa_questions WHERE id=?").bind(adminAnswerAttachmentMatch[1]).first();
        if (!question) return json({ error: "question_not_found" }, 404, cors);
        const answer = await env.DB.prepare(`
          SELECT id FROM qa_answers WHERE question_id=? AND response_type='team' AND source_ref IS NULL
          ORDER BY created_at DESC LIMIT 1
        `).bind(question.id).first();
        if (!answer) return json({ error: "answer_required_before_attachment" }, 409, cors);
        const result = await storeQaAttachment(request, env, { question, answerId: answer.id, userId: user.id });
        return result.error ? json({ error: result.error }, result.error === "attachment_limit_reached" ? 409 : 400, cors) : json(result, 201, cors);
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
