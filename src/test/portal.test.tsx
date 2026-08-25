import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPortalHeaderEmail, selectPrimaryPortalIdentity } from "@/lib/portalUser";
import { AnnouncementBody, Downloads, Portal, PortalSignIn } from "@/pages/Portal";

describe("portal migration experience", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
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
    expect(fetchMock).toHaveBeenLastCalledWith("/api/files?prefix=PHANTOM%2F", { credentials: "include" });
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

    expect(screen.getByRole("heading", { name: /clearer path from STA to downloads/i })).toBeInTheDocument();
    expect(screen.getByText(/Technology Transfer Center remains responsible/i)).toBeInTheDocument();
    expect(screen.getByText(/No signed agreement document is uploaded/i)).toBeInTheDocument();
    expect(screen.queryByText("DCC")).not.toBeInTheDocument();
    expect(screen.getByText(/If the answer is NO, please do not continue with the Software Transfer Agreement/i)).toBeInTheDocument();
    expect(screen.getAllByText(/If the answer is YES, please do not continue with the Software Transfer Agreement/i)).toHaveLength(2);
  });

  it("opens the STA workflow directly for the generated trailing-slash URL", () => {
    render(
      <MemoryRouter initialEntries={["/portal/request-access/"]}>
        <Portal publicLanding />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /clearer path from STA to downloads/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^sign in$/i })).not.toBeInTheDocument();
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

    expect(screen.getByRole("heading", { name: /add an approved user/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /approved user directory/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /unmatched sign-in requests/i })).toBeInTheDocument();
    expect(screen.getByText("approved.user@gmail.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /announcements/i }));
    expect(screen.getByRole("heading", { name: /publish an update/i })).toBeInTheDocument();
    expect(screen.queryByText(/original post date/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/original google groups url/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /add an approved user/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /activity/i }));
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
    expect(screen.getByLabelText("Account access for Approved Researcher")).toHaveValue("suspended");
    expect(screen.getByLabelText("Portal role for Approved Researcher")).toHaveValue("team");
    expect(screen.getByRole("button", { name: /delete user/i })).toBeInTheDocument();
  });
});
