import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Analytics } from "@/components/Analytics";

const analyticsMocks = vi.hoisted(() => ({
  trackCtaEvent: vi.fn(),
  trackLicensingEmailClick: vi.fn(),
  trackPageView: vi.fn(),
}));

vi.mock("@/lib/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analytics")>();
  return { ...actual, ...analyticsMocks };
});

describe("analytics interactions", () => {
  beforeEach(() => {
    analyticsMocks.trackCtaEvent.mockReset();
    analyticsMocks.trackLicensingEmailClick.mockReset();
    analyticsMocks.trackPageView.mockReset();
  });

  it("keeps tracking page views with the current path and query", () => {
    render(
      <MemoryRouter initialEntries={["/manuals/ncict?source=tools"]}>
        <Analytics />
      </MemoryRouter>,
    );

    expect(analyticsMocks.trackPageView).toHaveBeenCalledWith(
      "/manuals/ncict?source=tools",
    );
  });

  it.each([
    ["portal_login_click", "Open portal"],
    ["research_access_start", "Start research access"],
    ["vendor_evaluation_start", "Evaluate an API"],
    ["documentation_click", "Read the manual"],
  ])("tracks the allowlisted %s CTA with stable metadata", (eventName, label) => {
    render(
      <MemoryRouter initialEntries={["/tools/ncict?source=home"]}>
        <Analytics />
        <a
          href="/destination"
          data-analytics-event={eventName}
          data-analytics-location="product_hero"
          data-analytics-tool="ncict"
          data-analytics-audience="researcher"
          data-analytics-action="open_destination"
          onClick={(event) => event.preventDefault()}
        >
          <span>{label}</span>
        </a>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText(label));

    expect(analyticsMocks.trackCtaEvent).toHaveBeenCalledWith(
      eventName,
      "/tools/ncict?source=home",
      {
        ctaLocation: "product_hero",
        tool: "ncict",
        audience: "researcher",
        action: "open_destination",
      },
    );
  });

  it("ignores event names outside the CTA allowlist", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Analytics />
        <a
          href="/destination"
          data-analytics-event="arbitrary_event"
          data-analytics-location="home_hero"
          onClick={(event) => event.preventDefault()}
        >
          Unknown event
        </a>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Unknown event"));

    expect(analyticsMocks.trackCtaEvent).not.toHaveBeenCalled();
  });

  it("tracks Kevin Chang licensing email clicks with CTA metadata but without the address", () => {
    render(
      <MemoryRouter initialEntries={["/vendors?source=api-manual"]}>
        <Analytics />
        <a
          href="mailto:kevin.chang@nih.gov?subject=Licensing inquiry"
          data-analytics-location="api_manual_footer"
          data-analytics-tool="ncict"
          data-analytics-audience="vendor"
          data-analytics-action="email_technology_transfer"
          onClick={(event) => event.preventDefault()}
        >
          <span>Contact licensing</span>
        </a>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Contact licensing"));

    expect(analyticsMocks.trackLicensingEmailClick).toHaveBeenCalledWith(
      "/vendors?source=api-manual",
      {
        ctaLocation: "api_manual_footer",
        tool: "ncict",
        audience: "vendor",
        action: "email_technology_transfer",
      },
    );
    expect(analyticsMocks.trackLicensingEmailClick.mock.calls[0].flat().join(" ")).not.toContain(
      "kevin.chang@nih.gov",
    );
    expect(analyticsMocks.trackCtaEvent).not.toHaveBeenCalled();
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

  it("does not treat an untagged portal-hosted resource as a portal login", () => {
    render(
      <MemoryRouter initialEntries={["/discussions/example"]}>
        <Analytics />
        <a
          href="https://portal.ncidosetools.com/api/public/attachments/example"
          onClick={(event) => event.preventDefault()}
        >
          Public attachment
        </a>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Public attachment"));

    expect(analyticsMocks.trackCtaEvent).not.toHaveBeenCalled();
  });
});
