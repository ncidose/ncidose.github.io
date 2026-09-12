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
    expect(screen.getByRole("heading", { name: /Test an API in the live vendor sandbox/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Live API Sandbox/i })).toHaveAttribute("href", "/vendors#api-sandbox");
    expect(screen.getByRole("link", { name: /Open Live API Sandbox/i })).toHaveAttribute(
      "data-analytics-event",
      "vendor_sandbox_open",
    );

    for (const [product, tool] of [["NCICT API", "ncict"], ["NCINM API", "ncinm"], ["NCIRF API", "ncirf"]]) {
      const sandboxLink = screen.getByRole("link", { name: `Try ${product}` });
      expect(sandboxLink).toHaveAttribute("href", `/vendors?tool=${tool}#api-sandbox`);
      expect(sandboxLink).toHaveAttribute("data-analytics-event", "vendor_sandbox_open");
      expect(sandboxLink).toHaveAttribute("data-analytics-action", "open_live_demo");
      expect(sandboxLink).toHaveAttribute("data-analytics-location", "api_manual_card");
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
    expect(screen.getByText("Documented release September 9, 2026")).toBeInTheDocument();
    expect(screen.getByText("Scientific Corrections and Maintenance Update")).toBeInTheDocument();
    expect(screen.getByText("Latest scientific update September 9, 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Introduction" })).not.toHaveAttribute("href");
  });

  it("renders the September NCIRF scientific update and SpekPy workflow", () => {
    render(
      <MemoryRouter initialEntries={["/manuals/ncirf"]}>
        <Routes>
          <Route path="/manuals/:manualId" element={<Manuals />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Documented release September 10, 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Generating a Custom Spectrum with SpekPy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Adding, Saving, and Reusing Custom Spectra" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Custom spectrum generation window with SpekPy parameters and normalized spectrum preview",
      }),
    ).toHaveAttribute("src", "/manuals/images/ncirf4-custom-spectrum.png");
  });

  it("renders the September NCIRF API release and registered-spectrum workflow", () => {
    render(
      <MemoryRouter initialEntries={["/manuals/ncirf-api"]}>
        <Routes>
          <Route path="/manuals/:manualId" element={<Manuals />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Documented release September 10, 2026")).toBeInTheDocument();
    expect(screen.getByText("Scientific Update")).toBeInTheDocument();
    expect(screen.getByText("Latest scientific update September 10, 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Spectrum Catalog and Custom Beams" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vendor Workflow" })).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      name: "Example: Dose Request Using a Registered Custom Spectrum",
    })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Administrator Registration" })).toBeInTheDocument();
    expect(screen.getAllByText("matched.spectrum").length).toBeGreaterThan(0);
  });

  it("separates the September NCIRF scientific changes into GUI and API", () => {
    render(
      <MemoryRouter initialEntries={["/versions/ncirf"]}>
        <Routes>
          <Route path="/versions/:toolId" element={<Versions />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Scientific changes", level: 4 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "GUI", level: 5 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "API", level: 5 })).toBeInTheDocument();
    expect(screen.getByText("GET /spectra")).toBeInTheDocument();
    expect(screen.getAllByText("SpectrumID").length).toBeGreaterThan(0);
    expect(screen.getByText("matched.spectrum")).toBeInTheDocument();
  });

  it("distinguishes NCINM scientific corrections from calculation safeguards", () => {
    render(
      <MemoryRouter initialEntries={["/versions/ncinm"]}>
        <Routes>
          <Route path="/versions/:toolId" element={<Versions />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", {
      name: "September 9, 2026 — Scientific Corrections and Maintenance Update",
      level: 3,
    })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Scientific corrections", level: 4 })).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      name: "Calculation safeguards", level: 4,
    })).toBeInTheDocument();
    expect(screen.getByText("0.075 h")).toBeInTheDocument();
  });

  it("renders the NCINM GUI detail images beside the relevant instructions", () => {
    render(
      <MemoryRouter initialEntries={["/manuals/ncinm"]}>
        <Routes>
          <Route path="/manuals/:manualId" element={<Manuals />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Documented release September 9, 2026")).toBeInTheDocument();
    expect(screen.getByText("Scientific Corrections and Maintenance Update")).toBeInTheDocument();
    expect(screen.getByText("Latest scientific update September 9, 2026")).toBeInTheDocument();

    const expectedImages = [
      ["Fetus phantom tab and gestational-age selection", "ncinm3-fetus-phantom-selection.png"],
      ["Administered activity inputs in MBq and mCi", "ncinm3-administered-activity.png"],
      [
        "Maternal source-region table with residence-time and cumulated-activity columns",
        "ncinm3-source-region-table.png",
      ],
      [
        "Fetal target-region dose output with mass, dose, and dose-per-activity columns",
        "ncinm3-target-region-output.png",
      ],
      [
        "Export S Values, Clear Tables, and Batch dose calculation controls",
        "ncinm3-action-buttons.png",
      ],
    ];

    for (const [name, filename] of expectedImages) {
      expect(screen.getByRole("img", { name })).toHaveAttribute(
        "src",
        `/manuals/images/${filename}`,
      );
    }
  });

  it("places product-aware sandbox CTAs above and below each API manual", () => {
    render(
      <MemoryRouter initialEntries={["/manuals/ncict-api"]}>
        <Routes>
          <Route path="/manuals/:manualId" element={<Manuals />} />
        </Routes>
      </MemoryRouter>,
    );

    const sandboxLinks = screen.getAllByRole("link", {
      name: /Try NCICT API in Sandbox/i,
    });
    expect(sandboxLinks).toHaveLength(2);
    expect(sandboxLinks[0]).toHaveAttribute(
      "data-analytics-location",
      "api_manual_reader_top",
    );
    expect(sandboxLinks[1]).toHaveAttribute(
      "data-analytics-location",
      "api_manual_reader_bottom",
    );

    for (const link of sandboxLinks) {
      expect(link).toHaveAttribute("href", "/vendors?tool=ncict#api-sandbox");
      expect(link).toHaveAttribute("data-analytics-event", "vendor_sandbox_open");
    }

    const licensingLink = screen.getByRole("link", { name: /Discuss Commercial Licensing/i });
    const href = licensingLink.getAttribute("href") ?? "";
    const query = new URLSearchParams(href.split("?", 2)[1]);
    expect(href).toMatch(/^mailto:kevin\.chang@nih\.gov\?/);
    expect(query.get("subject")).toContain("NCICT API commercial licensing inquiry");
    expect(query.get("body")).toContain("Organization:");
    expect(query.get("body")).toContain("Expected request volume:");
    expect(query.get("body")).toContain("Deployment environment");
    expect(query.get("body")).toContain("Implementation timeline:");
    expect(query.get("body")).toContain("Proposed use:");

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
    expect(screen.getAllByText("September 9, 2026").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /May 2, 2026.*Scientific Update/ })).toBeInTheDocument();
    expect(screen.getAllByText("Scientific Update").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /April 15, 2026.*Scientific Update/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download approved releases/i })).toHaveAttribute(
      "href",
      "https://portal.ncidosetools.com",
    );
  });

  it.each([
    ["ncirf", "NCIRF Release History", "September 10, 2026"],
    ["ncinm", "NCINM Release History", "September 9, 2026"],
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
