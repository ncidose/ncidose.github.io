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

  it("states the safety and licensing boundaries before a demo is run", () => {
    render(<VendorApiSandbox />);

    expect(screen.getByText(/No identifiers/i)).toBeInTheDocument();
    expect(screen.getByText(/not for clinical use/i)).toBeInTheDocument();
    expect(screen.getByText(/same hypothetical inputs in your current solution/i)).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("offers varied NCIRF phantom and geometry inputs while fixing compute controls", () => {
    render(<VendorApiSandbox initialTool="ncirf" />);

    expect(screen.getByLabelText("Phantom library")).toBeInTheDocument();
    expect(screen.getByLabelText("Height (cm)")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight (kg)")).toBeInTheDocument();
    expect(screen.getByLabelText("Tube potential (kVp)")).toBeInTheDocument();
    expect(screen.getByLabelText("Primary angle (°)")).toBeInTheDocument();
    expect(screen.getByLabelText("Isocenter Z (cm)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/histories/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/threads/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Phantom library"), { target: { value: "5" } });
    expect(screen.getByLabelText("Gestational age")).toBeInTheDocument();
    expect(screen.queryByLabelText("Height (cm)")).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel").textContent).toContain("\"Hist\": 100000");
    expect(screen.getByRole("tabpanel").textContent).toContain("\"Thread\": 2");
  });
});
