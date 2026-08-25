import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Researchers from "@/pages/Researchers";

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

describe("researcher access guidance", () => {
  it("separates the STA path for new users from portal sign-in for approved users", () => {
    render(
      <MemoryRouter initialEntries={["/researchers"]}>
        <Researchers />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Free for approved non-commercial research/i })).toBeInTheDocument();
    expect(screen.getByText(/executed NCI Software Transfer Agreement.*required/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Prepare STA request/i })).toHaveAttribute("href", "/portal/request-access/");
    expect(screen.getByRole("link", { name: /Open User Portal/i })).toHaveAttribute("href", "https://portal.ncidosetools.com");
    expect(screen.getByText(/repeat the sign-in and new-user guidance/i)).toBeInTheDocument();
  });
});
