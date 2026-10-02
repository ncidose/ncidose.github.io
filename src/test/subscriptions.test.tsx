import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { BrowserRouter, Link, MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UpdateSubscription } from "@/components/UpdateSubscription";
import { AdminSubscribers } from "@/components/AdminSubscribers";
import { ScrollToTop } from "@/components/ScrollToTop";
import Portal from "@/pages/Portal";

afterEach(() => vi.unstubAllGlobals());

describe("public scientific subscriptions", () => {
  it("keeps the homepage form behind a small button until requested", () => {
    render(<UpdateSubscription compact />);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stay updated" }));
    expect(screen.getByRole("form", { name: "Subscribe to scientific updates" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });
  it("opens the homepage form from a footer link, including a repeated visit", async () => {
    window.history.replaceState({}, "", "/");
    Element.prototype.scrollIntoView = vi.fn();
    render(<BrowserRouter><ScrollToTop /><UpdateSubscription compact /><Link to="/#stay-updated">Subscribe from footer</Link></BrowserRouter>);
    fireEvent.click(screen.getByRole("link", { name: "Subscribe from footer" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Subscribe from footer" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    window.history.replaceState({}, "", "/");
  });
  for (const source of ["homepage", "sta", "vendor"] as const) {
    it(`submits an explicit opt-in with the ${source} source`, async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
      vi.stubGlobal("fetch", fetchMock);
      render(<UpdateSubscription source={source} />);
      fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), { target: { value: "reader@example.org" } });
      fireEvent.submit(screen.getByRole("form", { name: "Subscribe to scientific updates" }));
      expect(await screen.findByRole("status")).toHaveTextContent("Check your inbox to confirm");
      expect(fetchMock).toHaveBeenCalledWith("https://portal.ncidosetools.com/api/public/subscriptions", expect.objectContaining({ credentials: "omit", method: "POST", body: JSON.stringify({ email: "reader@example.org", source, website: "", consent: true }) }));
    });
  }

  it("keeps failed submissions editable and reports rate limits", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    render(<UpdateSubscription />);
    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), { target: { value: "reader@example.org" } });
    fireEvent.submit(screen.getByRole("form"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Email address" })).toHaveValue("reader@example.org");
  });

  it("offers a separate subscription form before STA eligibility is answered", () => {
    render(<MemoryRouter initialEntries={["/portal/request-access"]}><Portal publicLanding /></MemoryRouter>);
    const subscription = screen.getByRole("form", { name: "Subscribe to scientific updates", hidden: true });
    expect(subscription.parentElement?.closest("form")).toBeNull();
    expect(screen.getByRole("heading", { name: "Prepare your research access agreement." })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download prefilled STA" })).not.toBeInTheDocument();
  });

  it("offers subscription beside the Kevin Chang commercial inquiry link", () => {
    render(<MemoryRouter initialEntries={["/portal"]}><Portal publicLanding /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Commercial user.*Kevin Chang/ })).toHaveAttribute("href", expect.stringContaining("mailto:kevin.chang@nih.gov"));
    expect(screen.getByRole("form", { name: "Subscribe to scientific updates", hidden: true })).toBeInTheDocument();
  });
});

describe("subscriber administration", () => {
  it("offers public email only for Scientific Update and clears it when switching to maintenance", () => {
    window.sessionStorage.setItem("ncidose-portal-demo-user", "admin");
    render(<MemoryRouter initialEntries={["/portal/admin"]}><Portal /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));
    expect(screen.queryByRole("checkbox", { name: /Email scientific update subscribers/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Category" }), { target: { value: "Scientific" } });
    expect(screen.getByRole("checkbox", { name: /Email scientific update subscribers/ })).toBeChecked();
    fireEvent.change(screen.getByRole("combobox", { name: "Category" }), { target: { value: "Maintenance" } });
    expect(screen.queryByRole("checkbox", { name: /Email scientific update subscribers/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    window.sessionStorage.clear();
  });
  it("lists sources and requires confirmation before unsubscribing", async () => {
    const directory = { subscribers: [{ id: "subscriber-id", email: "reader@example.org", status: "active", source: "vendor", created_at: "2026-10-02 12:00:00", confirmed_at: "2026-10-02 12:01:00" }], total: 1, page: 1, counts: { active: 1 }, mail: [] };
    const fetchMock = vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: async () => options?.method === "PATCH" ? { ok: true } : directory }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    render(<AdminSubscribers demoMode={false} />);
    const row = (await screen.findByText("reader@example.org")).closest("tr")!;
    expect(within(row).getByText("Vendor licensing")).toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: "Unsubscribe" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/subscribers/subscriber-id", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "unsubscribed" }) })));
  });
});
