import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Engine from "@/pages/Engine";

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

describe("vendor sandbox and commercial access guidance", () => {
  it("leads with a product-aware sandbox and leaves commercial access for the final step", () => {
    render(
      <MemoryRouter initialEntries={["/vendors?tool=ncict#api-sandbox"]}>
        <Engine />
      </MemoryRouter>,
    );

    const hero = screen.getByRole("heading", { name: /REST API-Ready Reference Dosimetry/i }).closest("section");
    const sandbox = screen.getByRole("heading", { name: /Try the APIs live/i }).closest("section");
    const components = screen.getByRole("heading", { name: /Components vendors can test and review/i }).closest("section");
    const commercialAccess = screen.getByRole("heading", { name: /Plan production or commercial integration/i }).closest("section");
    expect(hero?.nextElementSibling).toBe(sandbox);
    expect(sandbox?.compareDocumentPosition(components as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(components?.nextElementSibling).toBe(commercialAccess);
    expect(sandbox).toHaveAttribute("id", "api-sandbox");
    expect(commercialAccess).toHaveAttribute("id", "commercial-access");

    expect(screen.getByRole("link", { name: /Try Live API Sandbox/i })).toHaveAttribute("href", "#api-sandbox");
    expect(screen.getByRole("tab", { name: /NCICT Adult chest CT/i })).toHaveAttribute("aria-selected", "true");

    expect(screen.getAllByRole("link", { name: /Approved User Portal/i }).some(
      (link) => link.getAttribute("href") === "https://portal.ncidosetools.com",
    )).toBe(true);
    expect(screen.getByRole("heading", { name: /Approved commercial user/i })).toBeInTheDocument();
    expect(screen.getByText(/commercial access has already been approved/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open User Portal/i })).toHaveAttribute("href", "https://portal.ncidosetools.com");
    expect(screen.getByRole("link", { name: /Open User Portal/i })).toHaveAttribute(
      "data-analytics-event",
      "portal_login_click",
    );

    const emailLink = screen.getByRole("link", { name: /Discuss NCICT commercial licensing/i });
    const href = emailLink.getAttribute("href") ?? "";
    const query = new URLSearchParams(href.split("?", 2)[1]);
    expect(href).toMatch(/^mailto:kevin\.chang@nih\.gov\?/);
    expect(query.get("subject")).toContain("NCICT REST API commercial licensing inquiry");
    expect(query.get("body")).toContain("Organization:");
    expect(query.get("body")).toContain("Expected request volume:");
    expect(query.get("body")).toContain("Deployment environment");
    expect(query.get("body")).toContain("Implementation timeline:");
    expect(query.get("body")).toContain("Proposed use:");
    expect(emailLink).toHaveAttribute("data-analytics-location", "vendor_commercial_access");
    expect(emailLink).toHaveAttribute("data-analytics-tool", "ncict");

    expect(screen.queryByText(/Request Evaluation/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review Commercial Access/i })).toHaveAttribute("href", "#commercial-access");
  });

  it("sends each API component to its sandbox and keeps PHANTOM on licensing", () => {
    render(
      <MemoryRouter initialEntries={["/vendors"]}>
        <Engine />
      </MemoryRouter>,
    );

    for (const [name, tool] of [
      ["Try NCICT in sandbox", "ncict"],
      ["Try NCIRF in sandbox", "ncirf"],
      ["Try NCINM in sandbox", "ncinm"],
    ]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", `/vendors?tool=${tool}#api-sandbox`);
      expect(link).toHaveAttribute("data-analytics-event", "vendor_sandbox_open");
      expect(link).toHaveAttribute("data-analytics-action", "open_live_demo");
    }

    const phantomLink = screen.getByRole("link", { name: "Discuss PHANTOM licensing" });
    const href = phantomLink.getAttribute("href") ?? "";
    const query = new URLSearchParams(href.split("?", 2)[1]);
    expect(query.get("subject")).toContain("PHANTOM libraries commercial licensing inquiry");
    expect(phantomLink).toHaveAttribute("data-analytics-action", "email_licensing");
  });
});
