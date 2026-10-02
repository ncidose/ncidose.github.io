import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Engine from "@/pages/Engine";
import { LicensingContact } from "@/components/LicensingContact";

class IntersectionObserverMock {
  root = null; rootMargin = "0px"; thresholds = [0];
  disconnect() {} observe() {} takeRecords() { return []; } unobserve() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
afterEach(() => vi.restoreAllMocks());

const HistoryBack = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Back</button>;
};

const licensingMessage = () => screen.getByRole("textbox", { name: "Prepared licensing inquiry", hidden: true });

describe("vendor sandbox and commercial access guidance", () => {
  it("offers licensing before testing and immediately after the sandbox", () => {
    render(<MemoryRouter initialEntries={["/vendors?tool=ncict"]}><Engine /></MemoryRouter>);
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    const sandbox = screen.getByRole("heading", { name: "Try the APIs live" }).closest("section");
    const commercial = screen.getByRole("heading", { name: "Discuss your integration" }).closest("section");
    expect(within(hero!).getByRole("link", { name: "Discuss Commercial Licensing" })).toHaveAttribute("href", "#commercial-access");
    expect(sandbox?.nextElementSibling).toBe(commercial);
    expect(screen.getByText(/completing a sandbox test is optional/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email Dr. Kevin Chang" })).toHaveAttribute("href", expect.stringContaining("subject=NCICT%20REST%20API"));
    expect(screen.getByRole("link", { name: /Open User Portal/ })).toHaveAttribute("href", "https://portal.ncidosetools.com");
  });

  it("keeps component links, tabs, manuals, licensing and browser history in sync", async () => {
    render(<MemoryRouter initialEntries={["/vendors"]}><Engine /><HistoryBack /></MemoryRouter>);
    fireEvent.click(screen.getByRole("link", { name: "Try NCINM in sandbox" }));
    await waitFor(() => expect(screen.getByRole("tab", { name: /NCINM Nuclear medicine/ })).toHaveAttribute("aria-selected", "true"));
    expect((licensingMessage() as HTMLTextAreaElement).value).toContain("NCINM REST API commercial licensing inquiry");
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(within(hero!).getByRole("link", { name: "View API Manual" })).toHaveAttribute("href", "/manuals/ncinm-api");
    fireEvent.click(screen.getByRole("tab", { name: /NCIRF Radiography/ }));
    expect(screen.getByRole("tab", { name: /NCIRF Radiography/ })).toHaveAttribute("aria-selected", "true");
    expect((licensingMessage() as HTMLTextAreaElement).value).toContain("NCIRF REST API commercial licensing inquiry");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(screen.getByRole("tab", { name: /NCICT CT/ })).toHaveAttribute("aria-selected", "true"));
    expect((licensingMessage() as HTMLTextAreaElement).value).toContain("NCICT REST API commercial licensing inquiry");
  });

  it("keeps PHANTOM inquiries about libraries", () => {
    render(<MemoryRouter initialEntries={["/vendors"]}><Engine /></MemoryRouter>);
    fireEvent.click(screen.getByRole("link", { name: "Discuss PHANTOM licensing" }));
    expect((licensingMessage() as HTMLTextAreaElement).value).toContain("PHANTOM libraries commercial licensing inquiry");
  });

  it("provides a usable webmail fallback when clipboard access is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("Clipboard unavailable")) } });
    render(<LicensingContact product="NCINM REST API" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy email address" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Select and copy");
    expect(screen.getByRole("textbox", { name: "Prepared licensing inquiry" })).toBeVisible();
    expect(screen.getByText("kevin.chang@nih.gov")).toBeInTheDocument();
  });
});
