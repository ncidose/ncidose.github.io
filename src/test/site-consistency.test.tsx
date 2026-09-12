import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiscussionMarkdown } from "@/components/DiscussionMarkdown";
import { demoApprovedUser } from "@/data/portalDemo";
import { installerVersionLabel, loadInstallerVersion } from "@/lib/portalReleases";
import { readableAnnouncementSummary, summarizeAnnouncement } from "@/lib/announcementSummary";
import { Downloads, Overview, PortalQuestions } from "@/pages/Portal";

afterEach(() => vi.unstubAllGlobals());

describe("current installer releases", () => {
  it("uses the latest desktop installer for each platform and ignores API and citation files", () => {
    expect(installerVersionLabel("NCICT", [
      { key: "NCICT/NCICT4.20260909_mac.dmg" },
      { key: "NCICT/NCICT4.20260502_mac.dmg" },
      { key: "NCICT/NCICT4.20260909_windows.exe" },
      { key: "NCICT/NCICTAPI4.20260911.zip" },
      { key: "NCICT/NCICT4.20990101_mac.dmg.pdf" },
      { key: "NCIRF/NCIRF4.20260910_mac.dmg" },
    ])).toBe("Version 4.20260909");
    expect(installerVersionLabel("NCIRF", [
      { key: "NCIRF/NCIRF4.20261001_mac.dmg" },
      { key: "NCIRF/NCIRF4.20260910_windows.exe" },
    ])).toBe("macOS: 4.20261001 · Windows: 4.20260910");
    expect(installerVersionLabel("NCINM", [])).toBe("No installers available");
  });

  it("reads all file-list pages so future releases need no frontend version edit", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ objects: [{ key: "NCINM/NCINM3.20260909_mac.dmg" }], cursor: "next" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ objects: [{ key: "NCINM/NCINM3.20261101_mac.dmg" }], cursor: null }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await loadInstallerVersion("NCINM", new AbortController().signal)).toBe("Version 3.20261101");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/files?prefix=NCINM%2F&cursor=next");
  });

  it("renders live versions independently of announcements and links each product to its folder", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input) => ({
      ok: true,
      json: async () => String(input) === "/api/announcements" ? { announcements: [] } : {
        objects: [{ key: "NCINM/NCINM3.20261101_mac.dmg" }], cursor: null,
      },
    })));
    render(<MemoryRouter><Overview user={demoApprovedUser} demoMode={false} /></MemoryRouter>);
    expect(await screen.findByText("Version 3.20261101")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download NCINM" })).toHaveAttribute("href", "/portal/downloads?tool=NCINM");
    expect(screen.getByRole("link", { name: "Download NCIRF" })).toHaveAttribute("href", "/portal/downloads?tool=NCIRF");
    expect(screen.queryByText("Version 3.20260510")).not.toBeInTheDocument();
  });

  it("opens a requested product and ignores a late response from the previous product", async () => {
    let resolveOld: (value: unknown) => void = () => {};
    vi.stubGlobal("fetch", vi.fn((input) => String(input).includes("NCINM")
      ? new Promise((resolve) => { resolveOld = resolve; })
      : Promise.resolve({ ok: true, json: async () => ({ objects: [{ key: "NCIRF/NCIRF4.20260910_mac.dmg", size: 100 }], folders: [], cursor: null }) })));
    render(<Downloads demoMode={false} initialTool="NCINM" />);
    expect(screen.getByRole("link", { name: "View NCINM manual" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /NCIRF Radiography/ }));
    expect(await screen.findByText("NCIRF4.20260910_mac.dmg")).toBeInTheDocument();
    await act(async () => resolveOld({ ok: true, json: async () => ({ objects: [{ key: "NCINM/old.exe", size: 1 }], folders: [], cursor: null }) }));
    await waitFor(() => expect(screen.getByRole("link", { name: "View NCIRF manual" })).toBeInTheDocument());
    expect(screen.queryByText("old.exe")).not.toBeInTheDocument();
  });
});

describe("shared discussion and announcement formatting", () => {
  it("updates the selected portal discussion when its URL changes", async () => {
    const questions = ["first", "second"].map((id) => ({ id, tool: "NCIRF", requestType: "technical_question", title: `${id} question`, body: `${id} body`, createdAt: "2026-09-01", status: "published", answers: [], attachments: [] }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ questions }) }));
    const SwitchDiscussion = () => {
      const navigate = useNavigate();
      return <button onClick={() => navigate("/portal/questions?discussion=second")}>Next discussion</button>;
    };
    render(<MemoryRouter initialEntries={["/portal/questions?discussion=first"]}><SwitchDiscussion /><PortalQuestions demoMode={false} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("first body")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Next discussion" }));
    await waitFor(() => expect(screen.getByText("second body")).toBeInTheDocument());
    expect(screen.queryByText("first body")).not.toBeInTheDocument();
  });

  it("renders a discussion attachment and paper link from Markdown", () => {
    render(<DiscussionMarkdown>{"![Beam view](https://example.org/beam.png)\n\n[Paper](https://example.org/paper.pdf)"}</DiscussionMarkdown>);
    expect(screen.getByRole("img", { name: "Beam view" })).toHaveAttribute("src", "https://example.org/beam.png");
    expect(screen.getByRole("link", { name: "Paper" })).toHaveAttribute("href", "https://example.org/paper.pdf");
    expect(screen.queryByText(/!\[Beam/)).not.toBeInTheDocument();
  });

  it("repairs old truncated summaries while preserving editorial summaries", () => {
    const body = "The pregnant phantom library has been updated. ".repeat(10);
    expect(readableAnnouncementSummary(body.slice(0, 300), body)).toBe(summarizeAnnouncement(body));
    expect(summarizeAnnouncement(body)).toMatch(/\S…$/);
    expect(summarizeAnnouncement(body).length).toBeLessThanOrEqual(300);
    expect(readableAnnouncementSummary("A deliberately short summary.", body)).toBe("A deliberately short summary.");
  });
});
