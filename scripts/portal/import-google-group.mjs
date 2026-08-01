import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readGoogleGroupExport } from "./google-group-csv.mjs";

const defaultCsv = resolve(".private/portal/ncidose.csv");
const csvPath = resolve(process.env.NCIDOSE_GROUP_CSV || defaultCsv);
const csv = await readFile(csvPath, "utf8");
const result = readGoogleGroupExport(csv);
const fingerprint = createHash("sha256").update(csv).digest("hex").slice(0, 12);

console.log(`Google Group export: ${csvPath}`);
console.log(`Fingerprint: ${fingerprint}`);
console.log(`Rows: ${result.members.length}`);
console.log(`Portal eligible: ${result.portalEligible.length}`);
console.log(`Awaiting membership: ${result.awaitingMembership.length}`);
console.log(`Statuses: ${Object.entries(result.statusCounts).sort().map(([status, count]) => `${status}=${count}`).join(", ")}`);
console.log(`Duplicate emails: ${result.duplicates.length}`);
console.log(`Invalid rows: ${result.invalid.length}`);

if (result.duplicates.length || result.invalid.length) process.exitCode = 1;

if (!process.argv.includes("--check")) {
  console.error("No database write was performed. Use the future authenticated portal importer to update production.");
  process.exitCode = 2;
}
