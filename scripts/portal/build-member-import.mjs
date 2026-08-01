import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { readGoogleGroupExport } from "./google-group-csv.mjs";

const csvPath = resolve(process.env.NCIDOSE_GROUP_CSV || ".private/portal/ncidose.csv");
const outputPath = resolve(process.env.NCIDOSE_GROUP_SQL || ".private/portal/group-import.sql");
const csv = await readFile(csvPath, "utf8");
const result = readGoogleGroupExport(csv);

if (result.duplicates.length || result.invalid.length) {
  throw new Error("Refusing to build an import with duplicate emails or invalid rows.");
}

const sha256 = createHash("sha256").update(csv).digest("hex");
const importId = `grp_${sha256.slice(0, 20)}`;
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const stableId = (prefix, email) => `${prefix}_${createHash("sha256").update(email).digest("hex").slice(0, 24)}`;
const statements = [
  `INSERT OR IGNORE INTO membership_imports (id, source_filename, source_sha256, total_rows, eligible_rows, pending_rows, imported_by) VALUES (${sqlString(importId)}, ${sqlString(basename(csvPath))}, ${sqlString(sha256)}, ${result.members.length}, ${result.portalEligible.length}, ${result.awaitingMembership.length}, 'local-admin-import');`,
];

for (const member of result.members) {
  statements.push(
    `INSERT INTO group_memberships (normalized_email, group_status, portal_eligible, last_import_id) VALUES (${sqlString(member.email)}, ${sqlString(member.groupStatus)}, ${member.approved ? 1 : 0}, ${sqlString(importId)}) ON CONFLICT(normalized_email) DO UPDATE SET group_status=excluded.group_status, portal_eligible=excluded.portal_eligible, last_seen_at=CURRENT_TIMESTAMP, last_import_id=excluded.last_import_id;`,
  );

  if (!member.approved) continue;
  const userId = stableId("usr", member.email);
  const identityId = stableId("eml", member.email);
  const portalRole = member.groupStatus === "owner" ? "admin" : "user";
  statements.push(
    `INSERT OR IGNORE INTO users (id, role, access_status, approval_source) VALUES (${sqlString(userId)}, ${sqlString(portalRole)}, 'active', 'google_group');`,
    `UPDATE users SET role=${sqlString(portalRole)}, access_status='active', updated_at=CURRENT_TIMESTAMP WHERE id=${sqlString(userId)};`,
    `INSERT OR IGNORE INTO user_identities (id, user_id, provider, normalized_email, is_primary) VALUES (${sqlString(identityId)}, ${sqlString(userId)}, 'google_group', ${sqlString(member.email)}, 1);`,
  );
}

statements.push(
  `UPDATE users SET access_status='suspended', updated_at=CURRENT_TIMESTAMP WHERE approval_source='google_group' AND NOT EXISTS (SELECT 1 FROM user_identities identity JOIN group_memberships membership ON membership.normalized_email=identity.normalized_email WHERE identity.user_id=users.id AND membership.last_import_id=${sqlString(importId)} AND membership.portal_eligible=1);`,
  "",
);

await mkdir(resolve(outputPath, ".."), { recursive: true });
await writeFile(outputPath, statements.join("\n"), { mode: 0o600 });
console.log(`Prepared private D1 import: rows=${result.members.length} portal_eligible=${result.portalEligible.length} awaiting=${result.awaitingMembership.length}`);
console.log(`Import fingerprint: ${sha256.slice(0, 12)}`);
console.log(`SQL statements: ${statements.length}`);
