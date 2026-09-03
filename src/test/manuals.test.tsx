import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Manuals from "@/pages/Manuals";
import Versions from "@/pages/Versions";

describe("public manuals", () => {
  it("lists research software and vendor API manuals", () => {
    render(
      <MemoryRouter initialEntries={["/manuals"]}>
        <Routes>
          <Route path="/manuals" element={<Manuals />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Manuals & API Documentation" })).toBeInTheDocument();
    expect(screen.getByText("NCICT 4 User Manual")).toBeInTheDocument();
    expect(screen.getByText("NCIRF API Manual")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Release History" })).toBeInTheDocument();
    expect(screen.getByText("NCICT Release History")).toBeInTheDocument();
    expect(screen.getByText("NCIRF Release History")).toBeInTheDocument();
    expect(screen.getByText("NCINM Release History")).toBeInTheDocument();
    expect(screen.getByText("PHANTOM Library History")).toBeInTheDocument();

    expect(document.querySelector('a[href="#research-software"]')).toHaveAttribute(
      "data-analytics-audience",
      "research",
    );
    expect(document.querySelector('a[href="#research-software"]')).toHaveAttribute(
      "data-analytics-event",
      "documentation_click",
    );
    expect(document.querySelector('a[href="#vendor-api-documentation"]')).toHaveAttribute(
      "data-analytics-audience",
      "vendor",
    );
    expect(document.querySelector('a[href="#release-history"]')).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Evaluate an API for your product workflow/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Request API Evaluation/i })).toHaveAttribute(
      "data-analytics-location",
      "api_manuals_section",
    );

    for (const product of ["NCICT API", "NCINM API", "NCIRF API"]) {
      const evaluationLink = screen.getByRole("link", { name: `Evaluate ${product}` });
      const href = evaluationLink.getAttribute("href") ?? "";
      const query = new URLSearchParams(href.split("?", 2)[1]);
      expect(href).toMatch(/^mailto:kevin\.chang@nih\.gov\?/);
      expect(query.get("subject")).toContain(product);
      expect(evaluationLink).not.toHaveAttribute("data-analytics-event");
      expect(evaluationLink).toHaveAttribute("data-analytics-action", "email_licensing");
      expect(evaluationLink).toHaveAttribute("data-analytics-location", "api_manual_card");
    }
  });

  it("renders a Markdown manual inside the website reader", () => {
    render(
      <MemoryRouter initialEntries={["/manuals/ncict"]}>
        <Routes>
          <Route path="/manuals/:manualId" element={<Manuals />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "NCICT 4 User Manual" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Introduction" })).toBeInTheDocument();
    expect(screen.getByText("Documented release 4.20260502")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Introduction" })).not.toHaveAttribute("href");
  });

  it("places product-aware evaluation CTAs above and below each API manual", () => {
    render(
      <MemoryRouter initialEntries={["/manuals/ncict-api"]}>
        <Routes>
          <Route path="/manuals/:manualId" element={<Manuals />} />
        </Routes>
      </MemoryRouter>,
    );

    const evaluationLinks = screen.getAllByRole("link", {
      name: /Request NCICT API Evaluation/i,
    });
    expect(evaluationLinks).toHaveLength(2);
    expect(evaluationLinks[0]).toHaveAttribute(
      "data-analytics-location",
      "api_manual_reader_top",
    );
    expect(evaluationLinks[1]).toHaveAttribute(
      "data-analytics-location",
      "api_manual_reader_bottom",
    );

    for (const link of evaluationLinks) {
      const href = link.getAttribute("href") ?? "";
      const query = new URLSearchParams(href.split("?", 2)[1]);
      expect(href).toMatch(/^mailto:kevin\.chang@nih\.gov\?/);
      expect(query.get("subject")).toContain("NCICT API");
      expect(query.get("body")).toContain("Organization:");
      expect(query.get("body")).toContain("Expected request volume:");
      expect(query.get("body")).toContain("Deployment environment");
      expect(query.get("body")).toContain("Evaluation timeline:");
      expect(query.get("body")).toContain("Proposed use:");
    }

    expect(document.querySelector('a[href^="mailto:changke@mail.nih.gov"]')).not.toBeInTheDocument();
  });

  it("renders the NCICT release record inside the documentation site", () => {
    render(
      <MemoryRouter initialEntries={["/versions/ncict"]}>
        <Routes>
          <Route path="/versions/:toolId" element={<Versions />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "NCICT Release History" })).toBeInTheDocument();
    expect(screen.getAllByText("May 2, 2026")).toHaveLength(2);
    expect(screen.getByText("4.20260415")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /April 15, 2026/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download approved releases/i })).toHaveAttribute(
      "href",
      "https://portal.ncidosetools.com",
    );
  });

  it.each([
    ["ncirf", "NCIRF Release History", "4.20260510"],
    ["ncinm", "NCINM Release History", "3.20260510"],
    ["phantom", "PHANTOM Library History", "August 20, 2026"],
  ])("renders the %s release record", (toolId, title, latestRelease) => {
    render(
      <MemoryRouter initialEntries={[`/versions/${toolId}`]}>
        <Routes>
          <Route path="/versions/:toolId" element={<Versions />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getAllByText(latestRelease).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Read the current manual/i })).toHaveAttribute(
      "href",
      `/manuals/${toolId}`,
    );
  });
});
