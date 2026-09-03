import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Protocols from "@/pages/Protocols";

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

const LocationProbe = () => {
  const location = useLocation();
  return <output aria-label="current location">{`${location.pathname}${location.hash}`}</output>;
};

describe("product-first tool pages", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline test"))));
  });

  it("opens a directly requested product with its decision CTAs before the suite comparison", () => {
    render(
      <MemoryRouter initialEntries={["/tools/ncinm"]}>
        <Routes>
          <Route path="/tools/:toolId" element={<Protocols />} />
        </Routes>
      </MemoryRouter>,
    );

    const productHeading = screen.getByRole("heading", { name: "NCINM", level: 1 });
    const comparisonHeading = screen.getByRole("heading", { name: "Compare the full suite" });

    expect(productHeading.compareDocumentPosition(comparisonHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("link", { name: "Read NCINM Manual" })).toHaveAttribute("href", "/manuals/ncinm");
    expect(screen.getByRole("link", { name: "Request Research Access" })).toHaveAttribute("href", "/portal/request-access/");
    expect(screen.getByRole("link", { name: "Evaluate NCINM REST API" })).toHaveAttribute(
      "href",
      "/vendors?tool=ncinm#commercial-access",
    );
  });

  it("uses a licensing discussion CTA for the shared PHANTOM library", () => {
    render(
      <MemoryRouter initialEntries={["/tools/phantom"]}>
        <Routes>
          <Route path="/tools/:toolId" element={<Protocols />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Discuss PHANTOM Licensing" })).toHaveAttribute(
      "href",
      "/vendors?tool=phantom#commercial-access",
    );
  });

  it("keeps the selected product summary in view when switching tabs", async () => {
    render(
      <MemoryRouter initialEntries={["/tools/ncict"]}>
        <Routes>
          <Route path="/tools/:toolId" element={<Protocols />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.mouseDown(screen.getByRole("tab", { name: "NCIRF" }), {
      button: 0,
      ctrlKey: false,
    });

    await waitFor(() => {
      expect(screen.getByLabelText("current location")).toHaveTextContent(
        "/tools/ncirf#tool-summary",
      );
    });
  });
});
