import { describe, expect, it } from "vitest";
import { parseCsv, readGoogleGroupExport } from "../../scripts/portal/google-group-csv.mjs";

describe("Google Groups CSV import", () => {
  it("parses quoted nicknames containing commas", () => {
    const rows = parseCsv('Email address,Nickname,Group status\nuser@example.org,"Researcher, Jane",member\n');
    expect(rows[1]).toEqual(["user@example.org", "Researcher, Jane", "member"]);
  });

  it("approves joined members but not invitations or pending requests", () => {
    const csv = [
      "Members for group NCI DOSE GROUP",
      "Email address,Nickname,Group status",
      "member@example.org,Member,member",
      "owner@example.org,Owner,owner",
      "invite@example.org,Invite,invited",
      "pending@example.org,Pending,pending",
    ].join("\n");

    const result = readGoogleGroupExport(csv);
    expect(result.portalEligible).toHaveLength(2);
    expect(result.awaitingMembership).toHaveLength(2);
    expect(result.invalid).toHaveLength(0);
  });
});
