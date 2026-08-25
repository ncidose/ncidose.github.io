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
  it("directs approved commercial users to the User Portal", () => {
    render(
      <MemoryRouter initialEntries={["/vendors"]}>
        <Engine />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("link", { name: /Approved User Portal/i }).some(
      (link) => link.getAttribute("href") === "https://portal.ncidosetools.com",
    )).toBe(true);
    expect(screen.getByRole("heading", { name: /Approved commercial user/i })).toBeInTheDocument();
    expect(screen.getByText(/commercial access has already been approved/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open User Portal/i })).toHaveAttribute("href", "https://portal.ncidosetools.com");
    expect(screen.getByRole("link", { name: /Email Dr. Kevin Chang/i })).toHaveAttribute("href", "mailto:kevin.chang@nih.gov");
  });
});
