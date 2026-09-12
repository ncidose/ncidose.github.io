import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Index from "@/pages/Index";
import { getLatestUpdates } from "@/data/latestUpdates.js";
import { releaseHistories } from "@/data/releases";

vi.mock("@/components/GlobalMap", () => ({
  GlobalMap: () => (
    <section>
      <h2>Global Distribution of NCI Dose Tools Users</h2>
    </section>
  ),
}));

class IntersectionObserverMock {
  root = null;
  rootMargin = "0px";
  thresholds = [0];
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
}

vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

const expectAnalytics = (
  element: Element | null,
  event: string,
  location: string,
  audience: string,
  action: string,
) => {
  expect(element).not.toBeNull();
  expect(element).toHaveAttribute("data-analytics-event", event);
  expect(element).toHaveAttribute("data-analytics-location", location);
  expect(element).toHaveAttribute("data-analytics-tool", "suite");
  expect(element).toHaveAttribute("data-analytics-audience", audience);
  expect(element).toHaveAttribute("data-analytics-action", action);
};

describe("homepage visitor paths", () => {
  it("shows dated release highlights before the role pathways, with one-click histories", () => {
    render(<MemoryRouter initialEntries={["/"]}><Index /></MemoryRouter>);
    const section = screen.getByRole("region", { name: "Latest updates" });
    const title = screen.getByRole("heading", { name: "NCI Dose Tools" });
    const pathways = screen.getByRole("heading", { name: "Where to Start" });
    expect(title.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(section.compareDocumentPosition(pathways) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const items = within(section).getAllByRole("listitem");
    const updates = getLatestUpdates(releaseHistories);
    expect(items).toHaveLength(4);
    updates.forEach((update, index) => {
      const link = within(items[index]).getByRole("link");
      expect(link).toHaveAttribute("href", update.href);
      expect(link).toHaveTextContent(update.product);
      expect(link).toHaveTextContent(update.summary);
      expect(link.querySelector("time")).toHaveAttribute("datetime", update.isoDate);
      expect(link.querySelector("time")).toHaveTextContent(update.date);
      expect(link).toHaveAttribute("data-analytics-event", "documentation_click");
      expect(link).toHaveAttribute("data-analytics-tool", update.id);
    });
    expect(within(section).getByRole("link", { name: "All version histories" }))
      .toHaveAttribute("href", "/manuals#release-history");
  });

  it("puts role-specific actions before product and trust content", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Index />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "NCI Dose Tools" })).toBeInTheDocument();
    expect(screen.getByText(/organ-dose estimation tools for CT/i)).toBeInTheDocument();

    const startingPointHeading = screen.getByRole("heading", { name: "Where to Start" });
    const productHeading = screen.getByRole("heading", { name: "What are the NCI Dose Tools?" });
    const trustHeading = screen.getByRole("heading", { name: "Global Distribution of NCI Dose Tools Users" });

    expect(startingPointHeading.compareDocumentPosition(productHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(productHeading.compareDocumentPosition(trustHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.getByRole("heading", { name: "Research Use" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vendor API Sandbox" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Approved User Portal" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Explore the Tools" })).not.toBeInTheDocument();
    expect(screen.queryByText(/new users can also start an access request from the same page/i)).not.toBeInTheDocument();
  });

  it("exposes measurable role pathways without duplicated hero actions", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Index />
      </MemoryRouter>,
    );

    expect(document.querySelector('[data-analytics-location="homepage_hero"]')).toBeNull();

    const pathwayLinks = document.querySelectorAll('[data-analytics-location="homepage_pathway"]');
    expect(pathwayLinks).toHaveLength(3);
    expectAnalytics(pathwayLinks[0], "research_access_start", "homepage_pathway", "researcher", "request_research_access");
    expectAnalytics(pathwayLinks[1], "vendor_sandbox_open", "homepage_pathway", "vendor", "open_live_demo");
    expectAnalytics(pathwayLinks[2], "portal_login_click", "homepage_pathway", "approved_user", "open_user_portal");
  });

  it("uses the streamlined navigation and labels the portal for approved users", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Index />
      </MemoryRouter>,
    );

    const header = document.querySelector("header");
    const desktopNavigation = header?.querySelector("nav");
    expect(desktopNavigation).not.toBeNull();
    expect(within(desktopNavigation as HTMLElement).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Tools",
      "Manuals",
      "For Researchers",
      "Vendor Sandbox",
      "Discussions",
      "Literature Registry",
    ]);
    expect(within(desktopNavigation as HTMLElement).getByRole("link", { name: "For Researchers" })).not.toHaveAttribute(
      "data-analytics-event",
    );
    const vendorNavigation = within(desktopNavigation as HTMLElement).getByRole("link", { name: "Vendor Sandbox" });
    expect(vendorNavigation).toHaveAttribute("href", "/vendors");
    expect(vendorNavigation).not.toHaveAttribute("data-analytics-event");

    const headerPortal = document.querySelector(
      '[data-analytics-location="site_header"][data-analytics-event="portal_login_click"]',
    );
    expect(headerPortal).toHaveTextContent("Approved User Portal");
    expectAnalytics(headerPortal, "portal_login_click", "site_header", "approved_user", "open_user_portal");

    const footerPortal = document.querySelector(
      '[data-analytics-location="site_footer"][data-analytics-event="portal_login_click"]',
    );
    expectAnalytics(footerPortal, "portal_login_click", "site_footer", "approved_user", "open_user_portal");
  });
});
