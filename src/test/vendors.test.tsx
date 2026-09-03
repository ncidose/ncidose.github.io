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

describe("commercial access guidance", () => {
  it("puts product-aware commercial access immediately after the hero", () => {
    render(
      <MemoryRouter initialEntries={["/vendors?tool=ncict#commercial-access"]}>
        <Engine />
      </MemoryRouter>,
    );

    const hero = screen.getByRole("heading", { name: /REST API-Ready Reference Dosimetry/i }).closest("section");
    const commercialAccess = screen.getByRole("heading", { name: /Start the commercial access conversation/i }).closest("section");
    expect(hero?.nextElementSibling).toBe(commercialAccess);
    expect(commercialAccess).toHaveAttribute("id", "commercial-access");

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

    const emailLink = screen.getByRole("link", { name: /Email Dr. Kevin Chang about NCICT/i });
    const href = emailLink.getAttribute("href") ?? "";
    const query = new URLSearchParams(href.split("?", 2)[1]);
    expect(href).toMatch(/^mailto:kevin\.chang@nih\.gov\?/);
    expect(query.get("subject")).toContain("NCICT REST API");
    expect(query.get("body")).toContain("Organization:");
    expect(query.get("body")).toContain("Expected request volume:");
    expect(query.get("body")).toContain("Deployment environment");
    expect(query.get("body")).toContain("Evaluation timeline:");
    expect(query.get("body")).toContain("Proposed use:");
    expect(emailLink).toHaveAttribute("data-analytics-location", "vendor_commercial_access");
    expect(emailLink).toHaveAttribute("data-analytics-tool", "ncict");

    expect(screen.getByRole("link", { name: /Request NCICT Evaluation/i })).toHaveAttribute(
      "data-analytics-location",
      "vendor_hero",
    );
    expect(screen.getByRole("link", { name: /^Request Evaluation/i })).toHaveAttribute(
      "data-analytics-location",
      "vendor_components_footer",
    );
  });

  it("offers a product-specific evaluation link for every component", () => {
    render(
      <MemoryRouter initialEntries={["/vendors"]}>
        <Engine />
      </MemoryRouter>,
    );

    for (const [name, product] of [
      ["Evaluate NCICT API", "NCICT REST API"],
      ["Evaluate NCIRF API", "NCIRF REST API"],
      ["Evaluate NCINM API", "NCINM REST API"],
      ["Discuss PHANTOM licensing", "PHANTOM libraries"],
    ]) {
      const link = screen.getByRole("link", { name });
      const href = link.getAttribute("href") ?? "";
      const query = new URLSearchParams(href.split("?", 2)[1]);
      expect(query.get("subject")).toContain(product);
      expect(link).not.toHaveAttribute("data-analytics-event");
      expect(link).toHaveAttribute("data-analytics-action", "email_licensing");
    }
  });
});
