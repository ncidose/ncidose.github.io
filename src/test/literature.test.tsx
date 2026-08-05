import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Literature from "@/pages/Literature";

const article = (pmid: string, title: string, publicationDate: string) => ({
  pmid,
  pmcid: null,
  title,
  journal: "Medical Physics",
  pubdate: "2026",
  year: "2026",
  publicationDate,
  authors: ["Researcher A", "Researcher B"],
  doi: null,
  sources: ["PubMed title/abstract"],
  pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
  pmcUrl: null,
});

const articles = [
  article("6", "Newest registry paper", "2026-08-03T13:00:00Z"),
  article("5", "Second newest registry paper", "2026-08-02T13:00:00Z"),
  article("4", "Third newest registry paper", "2026-08-01T13:00:00Z"),
  article("3", "Fourth newest registry paper", "2026-07-31T13:00:00Z"),
  article("2", "Fifth newest registry paper", "2026-07-30T13:00:00Z"),
  article("1", "Oldest registry paper", "2026-07-01T13:00:00Z"),
];

const payload = {
  generatedAt: "2026-08-03T13:00:00Z",
  note: "Generated test registry.",
  tools: [{
    id: "ncict",
    tool: "NCICT",
    modality: "CT dosimetry",
    summary: "NCICT publication registry.",
    queryUrls: { pubmedTitleAbstract: "https://pubmed.ncbi.nlm.nih.gov", pmcFullText: "https://pmc.ncbi.nlm.nih.gov" },
    counts: { pubmedTitleAbstract: 6, pmcMappedPmids: 0, displayedArticles: 6 },
    years: [{ year: "2026", count: 6, articles }],
  }],
};

describe("literature registry activity", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the five most recently published papers by PubMed publication date", async () => {
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));
    render(
      <MemoryRouter initialEntries={["/literature"]}>
        <Routes><Route path="/literature" element={<Literature />} /></Routes>
      </MemoryRouter>,
    );

    const heading = await screen.findByRole("heading", { name: "Recently published" });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    const recent = within(section!);
    expect(recent.getByText("Newest registry paper")).toBeInTheDocument();
    expect(recent.getByText("Fifth newest registry paper")).toBeInTheDocument();
    expect(recent.queryByText("Oldest registry paper")).not.toBeInTheDocument();
    expect(recent.getByText(/ordered by PubMed publication date/i)).toBeInTheDocument();
  });
});
