const APPROVED_GROUP_STATUSES = new Set(["member", "manager", "owner"]);

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

const normalizeEmail = (email) => email.trim().toLowerCase();

export function readGoogleGroupExport(text) {
  const rows = parseCsv(text).filter((row) => row.some((field) => field.trim()));
  const headerIndex = rows.findIndex((row) => row[0]?.trim() === "Email address");
  if (headerIndex < 0) throw new Error("Google Groups header row was not found.");

  const headers = rows[headerIndex].map((header) => header.trim());
  const emailIndex = headers.indexOf("Email address");
  const statusIndex = headers.indexOf("Group status");
  const joinYearIndex = headers.indexOf("Join year");
  const joinMonthIndex = headers.indexOf("Join month");
  const joinDayIndex = headers.indexOf("Join day");
  if (emailIndex < 0 || statusIndex < 0) {
    throw new Error("Google Groups export must include Email address and Group status.");
  }

  const seen = new Set();
  const members = [];
  const duplicates = [];
  const invalid = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const email = normalizeEmail(row[emailIndex] || "");
    const groupStatus = (row[statusIndex] || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      invalid.push({ row: headerIndex + members.length + invalid.length + 2 });
      continue;
    }
    if (seen.has(email)) {
      duplicates.push(email);
      continue;
    }
    seen.add(email);
    const joinYear = Number(row[joinYearIndex]);
    const joinMonth = Number(row[joinMonthIndex]);
    const joinDay = Number(row[joinDayIndex]);
    const joinedAt = joinYearIndex >= 0 && joinMonthIndex >= 0 && joinDayIndex >= 0
      && joinYear >= 2000 && joinMonth >= 1 && joinMonth <= 12 && joinDay >= 1 && joinDay <= 31
      ? `${joinYear}-${String(joinMonth).padStart(2, "0")}-${String(joinDay).padStart(2, "0")}`
      : null;
    members.push({ email, groupStatus, joinedAt, approved: APPROVED_GROUP_STATUSES.has(groupStatus) });
  }

  const statusCounts = members.reduce((counts, member) => {
    counts[member.groupStatus] = (counts[member.groupStatus] || 0) + 1;
    return counts;
  }, {});

  return {
    members,
    portalEligible: members.filter((member) => member.approved),
    awaitingMembership: members.filter((member) => !member.approved),
    statusCounts,
    duplicates,
    invalid,
  };
}
