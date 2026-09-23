import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPortalHeaderEmail, selectPrimaryPortalIdentity } from "@/lib/portalUser";
import { AnnouncementBody, Downloads, Portal, PortalSignIn } from "@/pages/Portal";

const portalTestMocks = vi.hoisted(() => ({
  downloadStaPdf: vi.fn(),
  trackResearchAccessPdfPrepared: vi.fn(),
}));

vi.mock("@/lib/staPdf", () => ({
  downloadStaPdf: portalTestMocks.downloadStaPdf,
}));

vi.mock("@/lib/analytics", () => ({
  trackResearchAccessPdfPrepared: portalTestMocks.trackResearchAccessPdfPrepared,
}));

const answerStaEligibility = (eligible = true) => {
  const nonprofit = screen.getByRole("group", { name: /nonprofit or government organization/i });
  const commercialReplacement = screen.getByRole("group", { name: /replace a commercially available dosimetry product/i });
  const clinicalUse = screen.getByRole("group", { name: /diagnose or treat patients/i });
  fireEvent.click(within(nonprofit).getByRole("radio", { name: eligible ? /yes/i : /no/i }));
  fireEvent.click(within(commercialReplacement).getByRole("radio", { name: /no/i }));
  fireEvent.click(within(clinicalUse).getByRole("radio", { name: /no/i }));
};

describe("portal migration experience", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    portalTestMocks.downloadStaPdf.mockReset().mockResolvedValue(undefined);
    portalTestMocks.trackResearchAccessPdfPrepared.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("turns URLs in announcement bodies into external links", () => {
    const url = "https://ncidose.github.io/versions/phantom";
    render(<AnnouncementBody>{`For details, visit ${url}`}</AnnouncementBody>);

    expect(screen.getByRole("link", { name: url })).toHaveAttribute("href", url);
    expect(screen.getByRole("link", { name: url })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: url })).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("returns to the selected tool root when its card is clicked from a subfolder", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = new URL(String(input), "https://portal.ncidosetools.com");
      const requestedPrefix = requestUrl.searchParams.get("prefix");
      const folders = requestedPrefix === "PHANTOM/"
        ? [{ prefix: "PHANTOM/nci_size/", downloadAvailable: true }]
        : requestedPrefix === "PHANTOM/nci_size/"
          ? [{ prefix: "PHANTOM/nci_size/armless_highres/", downloadAvailable: true }]
          : [];

      return {
        ok: true,
        json: async () => ({ objects: [], folders, cursor: null }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Downloads demoMode={false} />);

    fireEvent.click(screen.getByRole("button", { name: /PHANTOM Computational Phantom Library/i }));
    fireEvent.click(await screen.findByRole("button", { name: /nci_size Folder/i }));
    expect(await screen.findByRole("button", { name: /Up/i })).toBeInTheDocument();
    expect(screen.getByText("armless_highres")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /PHANTOM Computational Phantom Library/i }));

    await waitFor(() => expect(screen.getByText("nci_size")).toBeInTheDocument());
    expect(screen.queryByText("armless_highres")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Up/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/files?prefix=PHANTOM%2F", { credentials: "include", signal: expect.any(AbortSignal) });
  });

  it("shows the email used for the current sign-in in the portal header", () => {
    expect(getPortalHeaderEmail({
      primaryEmail: "approved.user@gmail.com",
      signedInEmail: "researcher@university.edu",
    })).toBe("researcher@university.edu");
    expect(getPortalHeaderEmail({ primaryEmail: "approved.user@gmail.com" })).toBe("approved.user@gmail.com");
  });

  it("lets either linked email become primary without removing the other", () => {
    const result = selectPrimaryPortalIdentity([
      { id: "gmail", email: "approved.user@gmail.com", primary: true },
      { id: "work", email: "researcher@university.edu", primary: false },
    ], "work");

    expect(result?.primaryEmail).toBe("researcher@university.edu");
    expect(result?.identities).toEqual([
      { id: "gmail", email: "approved.user@gmail.com", primary: false },
      { id: "work", email: "researcher@university.edu", primary: true },
    ]);
  });

  it("tells existing users they can keep their Gmail and approval", () => {
    render(
      <MemoryRouter initialEntries={["/portal"]}>
        <Portal />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Previous Google Group users/i)).toBeInTheDocument();
    expect(screen.getByText(/Newly approved users/i)).toBeInTheDocument();
    expect(screen.getByText(/secure User Portal verifies the email with a one-time code/i)).toBeInTheDocument();
    expect(screen.getByText(/Email verification alone does not grant software access/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Commercial user.*Email Dr. Kevin Chang/i })).toHaveAttribute("href", expect.stringContaining("mailto:kevin.chang@nih.gov"));
  });

  it("does not imply that an unrecognized email received a code", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ challengeId: "privacy-safe-challenge" }),
    } as Response));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PortalSignIn
        demoMode={false}
        accessDenied={false}
        onSignIn={vi.fn()}
        selfHostedAuth
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("name@institution.edu"), { target: { value: "random@example.org" } });
    fireEvent.click(screen.getByRole("button", { name: /send sign-in code/i }));

    expect(await screen.findByText(/This screen does not mean that a code was sent/i)).toBeInTheDocument();
    expect(screen.getByText(/portal shows the same screen for every email address/i)).toBeInTheDocument();
    expect(screen.getByText(/do not keep waiting or repeatedly request one/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose the access type that matches your intended use/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Research user.*Prepare and submit an STA/i })).toHaveAttribute("href", "https://ncidose.github.io/portal/request-access/");
    expect(screen.getByRole("link", { name: /Commercial user.*Email Dr. Kevin Chang/i })).toHaveAttribute("href", expect.stringContaining("mailto:kevin.chang@nih.gov"));
    expect(screen.getByRole("link", { name: "NCI Dose Team" })).toHaveAttribute(
      "href",
      "mailto:choonsik.lee@nih.gov?subject=NCI%20Dose%20Tools%20User%20Portal%20Help",
    );
  });

  it("opens an approved account without a new registration step", () => {
    render(
      <MemoryRouter initialEntries={["/portal"]}>
        <Portal />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /sign in with approved email/i }));

    expect(screen.getByText("Welcome, Approved Researcher")).toBeInTheDocument();
    expect(screen.getByText("Approved", { selector: ".text-3xl" })).toBeInTheDocument();
  });

  it("routes administrators to Admin and keeps the two activity reports separate", async () => {
    window.sessionStorage.setItem("ncidose-portal-demo-user", "admin");
    render(
      <MemoryRouter initialEntries={["/portal"]}>
        <Portal />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Portal administration" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sandbox API Activity" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "User Portal Activity" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Overview" }).every((link) => link.getAttribute("href") === "/portal/overview")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Sandbox API Activity" }));
    expect(screen.getByRole("row", { name: "NCIRF CPU 0 0 — — 0 / 0" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "NCIRF GPU 0 0 — — 0 / 0" })).toBeInTheDocument();

    const last30DaysButton = screen.getByRole("button", { name: "Show Last 30 days sandbox activity" });
    expect(last30DaysButton).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Show Today sandbox activity" }));
    expect(screen.getByRole("button", { name: "Show Today sandbox activity" })).toHaveAttribute("aria-pressed", "true");
    expect(last30DaysButton).toHaveAttribute("aria-pressed", "false");
    expect(within(screen.getByRole("heading", { name: "Usage by API" }).parentElement as HTMLElement).getByText("Today")).toBeInTheDocument();
    expect(within(screen.getByRole("heading", { name: "Approximate locations" }).parentElement as HTMLElement).getByText("Today")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show Last 7 days sandbox activity" }));
    expect(within(screen.getByRole("heading", { name: "Usage by API" }).parentElement as HTMLElement).getByText("Last 7 days")).toBeInTheDocument();
    expect(within(screen.getByRole("heading", { name: "Approximate locations" }).parentElement as HTMLElement).getByText("Last 7 days")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "User Portal Activity" }));
    expect(screen.getByRole("heading", { name: "Sign-ins and downloads" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "API sandbox usage" })).not.toBeInTheDocument();
  });

  it("keeps public resources visible inside the approved portal", () => {
    window.sessionStorage.setItem("ncidose-portal-demo-user", "user");
    render(
      <MemoryRouter initialEntries={["/portal/downloads"]}>
        <Portal />
      </MemoryRouter>,
    );

    const manualLinks = screen.getAllByRole("link", { name: /manuals/i });
    expect(manualLinks.some((link) => link.getAttribute("href") === "https://ncidose.github.io/manuals")).toBe(true);
    expect(screen.getByRole("link", { name: /view NCICT manual/i })).toHaveAttribute("href", "https://ncidose.github.io/manuals/ncict");
    expect(screen.getAllByRole("link", { name: /public website/i })[0]).toHaveAttribute("target", "_blank");
  });

  it("shows the branded public portal landing before secure authentication", () => {
    render(
      <MemoryRouter initialEntries={["/portal"]}>
        <Portal publicLanding />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /your approved tools, in one place/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with approved email/i })).toBeEnabled();
    expect(screen.getByText(/secure User Portal verifies the email with a one-time code/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /prepare and submit an STA/i })).toBeInTheDocument();
  });

  it("shows the NCI STA workflow for a new user", () => {
    render(
      <MemoryRouter initialEntries={["/portal/request-access"]}>
        <Portal />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /prepare your research access agreement/i })).toBeInTheDocument();
    expect(screen.getByText(/three quick eligibility questions/i)).toBeInTheDocument();
    expect(screen.getByText(/No signed agreement document is uploaded/i)).toBeInTheDocument();
    expect(screen.queryByText("DCC")).not.toBeInTheDocument();
    expect(screen.getByText(/Answer the three questions above to continue/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Your full name/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kevin\.chang@nih\.gov/i)).not.toBeInTheDocument();
  });

  it("sends an ineligible visitor to the live vendor sandbox instead of email", () => {
    render(
      <MemoryRouter initialEntries={["/portal/request-access"]}>
        <Portal />
      </MemoryRouter>,
    );

    answerStaEligibility(false);

    expect(screen.getByRole("heading", { name: /try the live vendor sandbox instead/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open vendor sandbox/i })).toHaveAttribute("href", "/vendors#api-sandbox");
    expect(screen.queryByText(/kevin\.chang@nih\.gov/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Your full name/i)).not.toBeInTheDocument();
  });

  it("reveals a shorter STA form and explains the authorized signer", () => {
    render(
      <MemoryRouter initialEntries={["/portal/request-access"]}>
        <Portal />
      </MemoryRouter>,
    );

    answerStaEligibility();

    expect(screen.getByLabelText(/Your full name/i)).toBeRequired();
    expect(screen.getByLabelText(/Work email/i)).toBeRequired();
    expect(screen.getByLabelText(/Phone/i)).toBeRequired();
    expect(screen.queryByLabelText(/^Country$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Legal notices/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Person authorized to sign for your organization/i));
    expect(screen.getByText(/may be your supervisor or principal investigator, but only if/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Authorized signer’s name/i)).not.toBeRequired();
  });

  it("opens the STA workflow directly for the generated trailing-slash URL", () => {
    render(
      <MemoryRouter initialEntries={["/portal/request-access/"]}>
        <Portal publicLanding />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /prepare your research access agreement/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^sign in$/i })).not.toBeInTheDocument();
  });

  it("tracks STA PDF preparation only after the PDF is created", async () => {
    render(
      <MemoryRouter initialEntries={["/portal/request-access?source=home"]}>
        <Portal />
      </MemoryRouter>,
    );

    answerStaEligibility();
    fireEvent.click(screen.getByRole("checkbox", { name: "NCICT" }));
    fireEvent.change(screen.getByLabelText(/Work email/i), { target: { value: "researcher@example.edu" } });
    fireEvent.change(screen.getByLabelText(/Phone/i), { target: { value: "+1 555 0100" } });
    fireEvent.change(screen.getByLabelText(/one sentence about your study/i), { target: { value: "Retrospective CT organ-dose study." } });
    const form = screen.getByRole("button", { name: /download prefilled STA/i }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(await screen.findByRole("heading", { name: /prefilled STA has been downloaded/i })).toBeInTheDocument();
    expect(portalTestMocks.downloadStaPdf).toHaveBeenCalledWith(expect.objectContaining({
      legalEmail: "researcher@example.edu",
      legalPhone: "+1 555 0100",
      researchUse: "Non-clinical radiation dosimetry research using NCICT. Planned work: Retrospective CT organ-dose study.",
    }));
    expect(portalTestMocks.trackResearchAccessPdfPrepared).toHaveBeenCalledWith(
      "/portal/request-access?source=home",
      {
        ctaLocation: "research_access_form",
        tool: "ncict",
        audience: "researcher",
        action: "sta_pdf_prepared",
      },
    );
    expect(JSON.stringify(portalTestMocks.trackResearchAccessPdfPrepared.mock.calls)).not.toContain("institution");
    expect(JSON.stringify(portalTestMocks.trackResearchAccessPdfPrepared.mock.calls)).not.toContain("email");
  });

  it("does not track STA PDF preparation when PDF creation fails", async () => {
    portalTestMocks.downloadStaPdf.mockRejectedValueOnce(new Error("PDF preparation failed"));
    render(
      <MemoryRouter initialEntries={["/portal/request-access"]}>
        <Portal />
      </MemoryRouter>,
    );

    answerStaEligibility();
    fireEvent.click(screen.getByRole("checkbox", { name: "NCICT" }));
    const form = screen.getByRole("button", { name: /download prefilled STA/i }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(await screen.findByRole("alert")).toHaveTextContent("PDF preparation failed");
    expect(portalTestMocks.trackResearchAccessPdfPrepared).not.toHaveBeenCalled();
  });

  it("lets an approved user add one optional email for verification", () => {
    window.sessionStorage.setItem("ncidose-portal-demo-user", "user");
    render(
      <MemoryRouter initialEntries={["/portal/account"]}>
        <Portal />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("secondary@email.com"), { target: { value: "researcher@university.edu" } });
    fireEvent.click(screen.getByRole("button", { name: /add email/i }));

    expect(screen.getAllByText("researcher@university.edu")).toHaveLength(2);
    expect(screen.getByText(/sign out and return to the User Portal/i)).toBeInTheDocument();
    expect(screen.queryByText(/Preview code/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /profile information/i })).toBeInTheDocument();
  });

  it("shows approved-user management only in the admin view", () => {
    window.sessionStorage.setItem("ncidose-portal-demo-user", "admin");
    render(
      <MemoryRouter initialEntries={["/portal/admin"]}>
        <Portal />
      </MemoryRouter>,
    );

    const primaryPortalNavLabels = screen.getAllByRole("link").map((link) => link.textContent?.trim()).filter((label) => ["Admin", "Overview", "Downloads", "Announcements", "Discussions", "Account"].includes(label || ""));
    expect(primaryPortalNavLabels[0]).toBe("Admin");
    expect(screen.getByRole("heading", { name: /api sandbox usage/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /user management/i }));
    expect(screen.getByRole("heading", { name: /add an approved user/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /approved user directory/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /unmatched sign-in requests/i })).not.toBeInTheDocument();
    expect(screen.getByText("approved.user@gmail.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show all approved users/i })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /show active users/i }));
    expect(screen.getByRole("heading", { name: /^active users$/i })).toBeInTheDocument();
    expect(screen.getByText("approved.user@gmail.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show suspended users/i }));
    expect(screen.getByRole("heading", { name: /^suspended users$/i })).toBeInTheDocument();
    expect(screen.getByText("No matching users.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show unmatched sign-in requests/i }));
    expect(screen.getByRole("heading", { name: /unmatched sign-in requests/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /approved user directory/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /add an approved user/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show unmatched sign-in requests/i })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /announcements/i }));
    expect(screen.getByRole("heading", { name: /publish an update/i })).toBeInTheDocument();
    expect(screen.queryByText(/original post date/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/original google groups url/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /add an approved user/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /user portal activity/i }));
    expect(screen.getByRole("heading", { name: /recent logins and downloads/i })).toBeInTheDocument();
    expect(screen.getByText(/No activity recorded/i)).toBeInTheDocument();
  });

  it("lets an administrator update institution and country and add a secondary email", () => {
    window.sessionStorage.setItem("ncidose-portal-demo-user", "admin");
    render(
      <MemoryRouter initialEntries={["/portal/admin"]}>
        <Portal />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /user management/i }));
    expect(screen.queryByRole("button", { name: /make team member/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^suspend$/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText("Institution for Approved Researcher"), { target: { value: "University of Utah" } });
    fireEvent.change(screen.getByLabelText("Country for Approved Researcher"), { target: { value: "United States" } });
    fireEvent.change(screen.getByLabelText("Secondary email for Approved Researcher"), { target: { value: "seth.streitmatter@gmail.com" } });
    fireEvent.change(screen.getByLabelText("Account access for Approved Researcher"), { target: { value: "suspended" } });
    fireEvent.change(screen.getByLabelText("Portal role for Approved Researcher"), { target: { value: "team" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(screen.getByText("University of Utah · United States")).toBeInTheDocument();
    expect(screen.getByText(/seth\.streitmatter@gmail\.com · pending/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Secondary email for Approved Researcher")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    expect(screen.getByLabelText("Secondary email for Approved Researcher")).toHaveValue("seth.streitmatter@gmail.com");
    expect(screen.getByLabelText("Account access for Approved Researcher")).toHaveValue("suspended");
    expect(screen.getByLabelText("Portal role for Approved Researcher")).toHaveValue("team");
    expect(screen.getByRole("button", { name: /delete user/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Secondary email for Approved Researcher"), { target: { value: "seth.corrected@gmail.com" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(screen.getByText(/seth\.corrected@gmail\.com · pending/i)).toBeInTheDocument();
    expect(screen.queryByText(/seth\.streitmatter@gmail\.com · pending/i)).not.toBeInTheDocument();
  });
});
