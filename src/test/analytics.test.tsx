import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Analytics } from "@/components/Analytics";

const analyticsMocks = vi.hoisted(() => ({
  trackLicensingEmailClick: vi.fn(),
  trackPageView: vi.fn(),
}));

vi.mock("@/lib/analytics", () => analyticsMocks);

describe("analytics interactions", () => {
  beforeEach(() => {
    analyticsMocks.trackLicensingEmailClick.mockReset();
    analyticsMocks.trackPageView.mockReset();
  });

  it("tracks Kevin Chang licensing email clicks without collecting the address", () => {
    render(
      <MemoryRouter initialEntries={["/vendors?source=api-manual"]}>
        <Analytics />
        <a href="mailto:kevin.chang@nih.gov?subject=Licensing inquiry" onClick={(event) => event.preventDefault()}>
          <span>Contact licensing</span>
        </a>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Contact licensing"));

    expect(analyticsMocks.trackLicensingEmailClick).toHaveBeenCalledWith("/vendors?source=api-manual");
  });

  it("ignores other email links", () => {
    render(
      <MemoryRouter initialEntries={["/vendors"]}>
        <Analytics />
        <a href="mailto:someone@example.com" onClick={(event) => event.preventDefault()}>Other contact</a>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Other contact"));

    expect(analyticsMocks.trackLicensingEmailClick).not.toHaveBeenCalled();
  });
});
