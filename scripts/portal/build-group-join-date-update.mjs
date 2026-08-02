import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readGoogleGroupExport } from "./google-group-csv.mjs";

const csvPath = resolve(process.env.NCIDOSE_GROUP_CSV || ".private/portal/ncidose.csv");
const outputPath = resolve(process.env.NCIDOSE_GROUP_SQL || ".private/portal/group-join-dates.sql");
const result = readGoogleGroupExport(await readFile(csvPath, "utf8"));
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const membersWithJoinDates = result.portalEligible.filter((member) => member.joinedAt);
const statements = membersWithJoinDates.map((member) => `
UPDATE users
SET group_joined_at=${sqlString(member.joinedAt)}, updated_at=CURRENT_TIMESTAMP
WHERE approval_source='google_group'
  AND EXISTS (
    SELECT 1 FROM user_identities identities
    WHERE identities.user_id=users.id
      AND identities.normalized_email=${sqlString(member.email)}
  );`.trim());

await writeFile(outputPath, `${statements.join("\n")}\n`, { mode: 0o600 });
console.log(`Prepared Google Group join-date update: ${membersWithJoinDates.length} approved members`);
console.log(`SQL statements: ${statements.length}`);
