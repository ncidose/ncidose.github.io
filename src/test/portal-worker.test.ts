import { describe, expect, it } from "vitest";
import { announcementEmailHtml, normalizePortalEmail } from "../../scripts/portal/worker.js";

describe("portal email normalization", () => {
  it("normalizes a valid approved email", () => {
    expect(normalizePortalEmail("  Researcher@University.EDU ")).toBe("researcher@university.edu");
  });

  it("rejects malformed email values", () => {
    expect(normalizePortalEmail("not-an-email")).toBe("");
    expect(normalizePortalEmail("person@example")).toBe("");
  });
});

describe("announcement email template", () => {
  it("uses the shared team signature and safely renders a preview", () => {
    const html = announcementEmailHtml({
      title: "Release <Update>",
      body: "A new version is available.",
      category: "Release",
    }, { preview: true, includeUnsubscribe: false });

    expect(html).toContain("NCI Dose Tools Team");
    expect(html).toContain("National Cancer Institute");
    expect(html).toContain("Preview · Sent only to the portal administrator");
    expect(html).toContain("Release &lt;Update&gt;");
    expect(html).not.toContain("RESEND_UNSUBSCRIBE_URL");
  });
});
