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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      usage: { used: 0, limit: 30, remaining: 30, windowMinutes: 60 },
    }), { status: 200, headers: { "content-type": "application/json" } })));
  });

  it("sends only a preset identifier and renders the live API response", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => new Response(JSON.stringify(
      options?.method === "POST"
        ? {
            ok: true,
            demo: { tool: "ncinm", presetId: "ncinm-fdg-adult", upstreamStatus: 200, durationMs: 42 },
            usage: { used: 3, limit: 30, remaining: 27, windowMinutes: 60 },
            request: { phantom_library: 2 },
            response: { ok: true, dose_mGy: { effective_dose_mSv: 3.25 } },
          }
        : { ok: true, usage: { used: 2, limit: 30, remaining: 28, windowMinutes: 60 } },
    ), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<VendorApiSandbox initialTool="ncinm" />);
    fireEvent.change(screen.getByLabelText("Radiopharmaceutical name"), { target: { value: "Tc99m MDP bone scan" } });
    fireEvent.change(screen.getByLabelText("Sex"), { target: { value: "male" } });
    await waitFor(() => expect(screen.getByLabelText("Sex")).toHaveValue("male"));
    fireEvent.click(screen.getByRole("button", { name: /Run NCINM demo/i }));

    await waitFor(() => expect(screen.getByText(/Live calculation completed/i)).toBeInTheDocument());
    const postCall = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(postCall).toBeDefined();
    const [url, options] = postCall!;
    expect(url).toBe("https://portal.ncidosetools.com/api/public/vendor-demo");
    expect(JSON.parse(String(options.body))).toEqual({
      presetId: "ncinm-fdg-adult",
      parameters: {
        phantomLibrary: 2,
        sex: "male",
        age: 58,
        radiopharmaceutical: "Tc99m MDP bone scan",
        administeredActivityMbq: 200,
      },
    });
    expect(JSON.stringify(options)).not.toContain("X-API-Key");
    const responseText = screen.getByText(/"effective_dose_mSv": 3.25/i);
    expect(responseText).toBeInTheDocument();
    expect(responseText.closest("pre")).toHaveClass("whitespace-pre-wrap", "break-words");
    expect(responseText.closest("pre")).not.toHaveClass("overflow-auto", "h-[360px]");
    expect(screen.getByText(/3 of 30 runs used in the last hour/i)).toBeInTheDocument();
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

  it("shows NCICT and NCINM inputs directly while stating evaluation boundaries", () => {
    render(<VendorApiSandbox />);

    expect(screen.getByRole("heading", { name: "Try the APIs live" })).toBeInTheDocument();
    expect(screen.getByText(/No identifiers/i)).toBeInTheDocument();
    expect(screen.getByText(/No production or clinical use/i)).toBeInTheDocument();
    expect(screen.getByText(/Single-case requests/i)).toBeInTheDocument();
    expect(screen.getByText(/30 runs \/ hour/i)).toBeInTheDocument();
    expect(screen.queryByText(/Usually completes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adjust the bounded inputs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adjust scan coverage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Choose age\/sex, WED/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Starting values/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/same hypothetical inputs in your current solution/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Advanced patient & scanner inputs/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /NCICT API manual/i })).toHaveAttribute("href", "/manuals/ncict-api");
    fireEvent.change(screen.getByLabelText("Body-size matching"), { target: { value: "wed" } });
    expect(screen.getByLabelText("Water-equivalent diameter · WED (cm)")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Body-size matching"), { target: { value: "height-weight" } });
    expect(screen.getByLabelText("Height (cm)")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight (kg)")).toBeInTheDocument();
    expect(screen.getByLabelText("CTDI phantom")).toBeInTheDocument();
    expect(screen.getByText(/Tube current modulation strength/i)).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);

    fireEvent.click(screen.getByRole("tab", { name: /NCINM/i }));
    expect(screen.getByLabelText("Radiopharmaceutical name")).toHaveValue("F-18 FDG");
    expect(screen.queryByText(/matched entry, method, and score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Usually completes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Enter patient settings, activity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Match phantom and patient settings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Advanced phantom & patient inputs/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Phantom library")).toBeInTheDocument();
    expect(screen.getByLabelText("Sex")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /NCINM API manual/i })).toHaveAttribute("href", "/manuals/ncinm-api");
  });

  it("offers varied NCIRF phantom and geometry inputs while fixing compute controls", () => {
    render(<VendorApiSandbox initialTool="ncirf" />);

    expect(screen.getByText(/Advanced RDSR-derived geometry/i)).toBeInTheDocument();
    expect(screen.getByText(/5 runs \/ 30 min/i)).toBeInTheDocument();
    const expectedTime = screen.getByText(/Reduced-history demonstration; usually under 30 seconds/i);
    const particleHistories = screen.getByText(/Particle histories \(10,000\)/i);
    expect(expectedTime).toBeInTheDocument();
    expect(expectedTime.compareDocumentPosition(particleHistories) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText(/Case ID is synthetic/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adjust the bounded inputs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adjust phantom, spectrum/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Enter one normalized irradiation event/i)).not.toBeInTheDocument();
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
    expect(screen.getByRole("tabpanel").textContent).toContain("\"Hist\": 10000");
    expect(screen.getByRole("tabpanel").textContent).toContain("\"Thread\": 2");
    expect(screen.getByText(/approved dedicated vendor deployment/i)).toBeInTheDocument();
  });
});
