import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VendorApiSandbox } from "@/components/VendorApiSandbox";

const analyticsMocks = vi.hoisted(() => ({
  trackVendorSandboxEvent: vi.fn(),
}));

vi.mock("@/lib/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analytics")>();
  return { ...actual, ...analyticsMocks };
});

describe("vendor API sandbox", () => {
  beforeEach(() => {
    analyticsMocks.trackVendorSandboxEvent.mockReset();
    vi.unstubAllGlobals();
  });

  it("sends only a preset identifier and renders the live API response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      demo: { tool: "ncinm", presetId: "ncinm-fdg-adult", upstreamStatus: 200, durationMs: 42 },
      request: { phantom_library: 2 },
      response: { ok: true, dose_mGy: { effective_dose_mSv: 3.25 } },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<VendorApiSandbox initialTool="ncinm" />);
    fireEvent.click(screen.getByText(/Advanced phantom & patient inputs/i));
    fireEvent.change(screen.getByLabelText("Sex"), { target: { value: "male" } });
    await waitFor(() => expect(screen.getByLabelText("Sex")).toHaveValue("male"));
    fireEvent.click(screen.getByRole("button", { name: /Run NCINM demo/i }));

    await waitFor(() => expect(screen.getByText(/Live calculation completed/i)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://portal.ncidosetools.com/api/public/vendor-demo");
    expect(JSON.parse(String(options.body))).toEqual({
      presetId: "ncinm-fdg-adult",
      parameters: {
        phantomLibrary: 2,
        sex: "male",
        age: 58,
        administeredActivityMbq: 200,
      },
    });
    expect(JSON.stringify(options)).not.toContain("X-API-Key");
    const responseText = screen.getByText(/"effective_dose_mSv": 3.25/i);
    expect(responseText).toBeInTheDocument();
    expect(responseText.closest("pre")).toHaveClass("whitespace-pre-wrap", "break-words");
    expect(responseText.closest("pre")).not.toHaveClass("overflow-auto", "h-[360px]");
    expect(analyticsMocks.trackVendorSandboxEvent).toHaveBeenCalledWith(
      "vendor_sandbox_run",
      "ncinm",
      "ncinm-fdg-adult",
    );
    expect(analyticsMocks.trackVendorSandboxEvent).toHaveBeenCalledWith(
      "vendor_sandbox_success",
      "ncinm",
      "ncinm-fdg-adult",
      200,
      expect.any(Number),
    );
  });

  it("keeps simple and advanced inputs distinct while stating evaluation boundaries", () => {
    render(<VendorApiSandbox />);

    expect(screen.getByText(/No identifiers/i)).toBeInTheDocument();
    expect(screen.getByText(/No production or clinical use/i)).toBeInTheDocument();
    expect(screen.getByText(/Single-case requests/i)).toBeInTheDocument();
    expect(screen.getByText(/30 runs \/ hour/i)).toBeInTheDocument();
    expect(screen.queryByText(/same hypothetical inputs in your current solution/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Advanced patient & scanner inputs/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /NCICT API manual/i })).toHaveAttribute("href", "/manuals/ncict-api");
    expect(screen.getAllByRole("tab")).toHaveLength(3);

    fireEvent.click(screen.getByRole("tab", { name: /NCINM/i }));
    expect(screen.getByText(/Advanced phantom & patient inputs/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /NCINM API manual/i })).toHaveAttribute("href", "/manuals/ncinm-api");
  });

  it("offers varied NCIRF phantom and geometry inputs while fixing compute controls", () => {
    render(<VendorApiSandbox initialTool="ncirf" />);

    expect(screen.getByText(/Advanced RDSR-derived geometry/i)).toBeInTheDocument();
    expect(screen.getByText(/5 runs \/ 30 min/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /NCIRF API manual/i })).toHaveAttribute("href", "/manuals/ncirf-api");
    fireEvent.click(screen.getByText(/Advanced RDSR-derived geometry/i));
    expect(screen.getByLabelText("Phantom library")).toBeInTheDocument();
    expect(screen.getByLabelText("Height (cm)")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight (kg)")).toBeInTheDocument();
    expect(screen.getByLabelText("Tube potential (kVp)")).toBeInTheDocument();
    expect(screen.getByLabelText("Primary angle · PPA (°)")).toBeInTheDocument();
    expect(screen.getByLabelText("Isocenter Z · ISOZ (cm)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/histories/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/threads/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Phantom library"), { target: { value: "5" } });
    expect(screen.getByLabelText("Gestational age")).toBeInTheDocument();
    expect(screen.queryByLabelText("Height (cm)")).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel").textContent).toContain("\"Hist\": 100000");
    expect(screen.getByRole("tabpanel").textContent).toContain("\"Thread\": 2");
  });
});
