import { describe, expect, it } from "vitest";
import { announcementEmailHtml, generateLoginCode, loginCodeEmailHtml, normalizePortalEmail, portalSessionCookieHeader, secondaryEmailAddedHtml, welcomeEmailHtml } from "../../scripts/portal/worker.js";

describe("portal email normalization", () => {
  it("normalizes a valid approved email", () => {
    expect(normalizePortalEmail("  Researcher@University.EDU ")).toBe("researcher@university.edu");
  });

  it("generates a six-digit one-time code", () => {
    expect(generateLoginCode()).toMatch(/^[0-9]{6}$/);
  });

  it("uses a host-only secure session cookie that JavaScript cannot read", () => {
    const header = portalSessionCookieHeader("secret-token");

    expect(header).toContain("__Host-ncidose_session=secret-token");
    expect(header).toContain("Max-Age=2592000");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
    expect(header).not.toContain("Domain=");
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

    expect(html).toContain("NCI Dose Team");
    expect(html).toContain('>NCI Dose Tools portal</a>');
    expect(html).toContain("National Cancer Institute");
    expect(html.match(/href="https:\/\/ncidose\.github\.io\/"/g)).toHaveLength(2);
    expect(html).not.toContain("Visit the NCI Dose Tools public website");
    expect(html).toContain("Preview · Sent only to the portal administrator");
    expect(html).toContain("Release &lt;Update&gt;");
    expect(html).not.toContain("RESEND_UNSUBSCRIBE_URL");
  });

  it("renders a transactional welcome without an unsubscribe link", () => {
    const html = welcomeEmailHtml("Test Researcher", "researcher@example.org");

    expect(html).toContain("Welcome to the NCI Dose Tools User Portal");
    expect(html).toContain("Approved User Access");
    expect(html).toContain("researcher@example.org");
    expect(html).toContain("NCI Dose Team");
    expect(html).not.toContain("RESEND_UNSUBSCRIBE_URL");
  });

  it("confirms a secondary email and explains verification", () => {
    const html = secondaryEmailAddedHtml("Test Researcher", "secondary@example.org");

    expect(html).toContain("Secondary email added to your NCI Dose Tools account");
    expect(html).toContain("Account Confirmation");
    expect(html).toContain("secondary@example.org");
    expect(html).toContain("you can sign in with either email");
    expect(html).not.toContain("RESEND_UNSUBSCRIBE_URL");
  });

  it("renders a branded expiring portal login code", () => {
    const html = loginCodeEmailHtml("123456");

    expect(html).toContain("Your NCI Dose Tools sign-in code");
    expect(html).toContain("123456");
    expect(html).toContain("expires in 10 minutes");
    expect(html).toContain("NCI Dose Team");
    expect(html).not.toContain("RESEND_UNSUBSCRIBE_URL");
  });
});
