import { describe, expect, it } from "vitest";
import { announcementEmailHtml, canPublishQuestion, canViewDiscussion, discussionAuthorForUser, folderArchiveKeys, generateLoginCode, isFolderDownloadPrefix, loginCodeEmailHtml, normalizePortalEmail, normalizeQuestionVisibility, portalSessionCookieHeader, qaAttachmentValidationError, secondaryEmailAddedHtml, shouldNotifyDiscussionReplyRecipient, shouldNotifyNewDiscussionRecipient, welcomeEmailHtml } from "../../scripts/portal/worker.js";

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

describe("Q&A attachment validation", () => {
  it("accepts supported technical files within 10 MB", () => {
    expect(qaAttachmentValidationError({ name: "dose-report.pdf", type: "application/pdf", size: 1024 })).toBe("");
    expect(qaAttachmentValidationError({ name: "error.log", type: "text/plain", size: 2048 })).toBe("");
  });

  it("rejects oversized or unsupported files", () => {
    expect(qaAttachmentValidationError({ name: "large.pdf", type: "application/pdf", size: 10 * 1024 * 1024 + 1 })).toBe("attachment_too_large");
    expect(qaAttachmentValidationError({ name: "script.html", type: "text/html", size: 100 })).toBe("attachment_type_not_allowed");
  });
});

describe("folder downloads", () => {
  it("supports nested PHANTOM and DCC folders through hidden archives", () => {
    expect(isFolderDownloadPrefix("PHANTOM/nci_size/")).toBe(true);
    expect(isFolderDownloadPrefix("DCC/nevada_nuclear_bomb_test/thyroid_dose/")).toBe(true);
    expect(folderArchiveKeys("PHANTOM/nci_size/")).toEqual([
      "_folder-downloads/PHANTOM/nci_size.zip",
      "PHANTOM/nci_size.zip",
    ]);
  });

  it("does not add folder downloads to the three flat software distributions", () => {
    expect(isFolderDownloadPrefix("NCICT/releases/")).toBe(false);
    expect(isFolderDownloadPrefix("NCINM/data/")).toBe(false);
    expect(isFolderDownloadPrefix("NCIRF/examples/")).toBe(false);
    expect(isFolderDownloadPrefix("PHANTOM/")).toBe(false);
  });
});

describe("Q&A visibility", () => {
  it("defaults to reviewable public sharing and blocks team-only publication", () => {
    expect(normalizeQuestionVisibility(undefined)).toBe("public_after_review");
    expect(normalizeQuestionVisibility("team_only")).toBe("team_only");
    expect(canPublishQuestion("public_after_review")).toBe(true);
    expect(canPublishQuestion("team_only")).toBe(false);
  });

  it("allows public reading while keeping private discussions between the author and team", () => {
    const community = { id: "user-1", role: "user", discussion_role: "community" };
    const other = { id: "user-2", role: "user", discussion_role: "community" };
    const team = { id: "team-1", role: "user", discussion_role: "team" };
    expect(canViewDiscussion({ status: "published", visibility: "public_after_review", submitted_by_user_id: community.id }, other)).toBe(true);
    expect(canViewDiscussion({ status: "submitted", visibility: "team_only", submitted_by_user_id: community.id }, community)).toBe(true);
    expect(canViewDiscussion({ status: "submitted", visibility: "team_only", submitted_by_user_id: community.id }, other)).toBe(false);
    expect(canViewDiscussion({ status: "submitted", visibility: "team_only", submitted_by_user_id: community.id }, team)).toBe(true);
  });

  it("labels designated team members separately from community users", () => {
    expect(discussionAuthorForUser({ role: "admin", discussion_role: "team", discussion_handle: "choonsiklee" })).toEqual({ type: "team", name: "@choonsiklee" });
    expect(discussionAuthorForUser({ role: "user", discussion_role: "community", display_name: "Grace Lee" })).toEqual({ type: "community", name: "Grace Lee" });
  });

  it("notifies every designated team member about a new private discussion", () => {
    const author = { id: "user-1", role: "user", discussion_role: "community" };
    const administrator = { id: "admin-1", role: "admin", discussion_role: "team" };
    const teamMember = { id: "team-1", role: "user", discussion_role: "team" };
    const communityMember = { id: "user-2", role: "user", discussion_role: "community" };

    expect(shouldNotifyNewDiscussionRecipient("team_only", author.id, administrator)).toBe(true);
    expect(shouldNotifyNewDiscussionRecipient("team_only", author.id, teamMember)).toBe(true);
    expect(shouldNotifyNewDiscussionRecipient("team_only", author.id, communityMember)).toBe(false);
    expect(shouldNotifyNewDiscussionRecipient("team_only", author.id, author)).toBe(false);
  });

  it("keeps the private team informed as replies accumulate", () => {
    const question = { visibility: "team_only", submitted_by_user_id: "user-1" };
    const replyingTeamMember = { id: "team-1", role: "user", discussion_role: "team" };
    const otherTeamMember = { id: "team-2", role: "user", discussion_role: "team" };
    const submitter = { id: "user-1", role: "user", discussion_role: "community" };
    const unrelatedUser = { id: "user-2", role: "user", discussion_role: "community" };

    expect(shouldNotifyDiscussionReplyRecipient(question, replyingTeamMember, otherTeamMember)).toBe(true);
    expect(shouldNotifyDiscussionReplyRecipient(question, replyingTeamMember, submitter)).toBe(true);
    expect(shouldNotifyDiscussionReplyRecipient(question, replyingTeamMember, unrelatedUser)).toBe(false);
    expect(shouldNotifyDiscussionReplyRecipient(question, replyingTeamMember, replyingTeamMember)).toBe(false);
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

  it("turns plain announcement URLs into safe email links", () => {
    const url = "https://ncidose.github.io/versions/phantom";
    const html = announcementEmailHtml({
      title: "PHANTOM maintenance",
      body: `Read the details at ${url}.\n\n<script>alert(1)</script>`,
      category: "Maintenance",
    });

    expect(html).toContain(`href="${url}"`);
    expect(html).toContain(`>${url}</a>.`);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("renders a transactional welcome without an unsubscribe link", () => {
    const html = welcomeEmailHtml("Test Researcher", "researcher@example.org");

    expect(html).toContain("Welcome to the NCI Dose Tools User Portal");
    expect(html).toContain("Approved User Access");
    expect(html).toContain("researcher@example.org");
    expect(html).toContain("Sign in using this exact email address");
    expect(html).toContain("Other email addresses will not receive a code unless they are already linked");
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
