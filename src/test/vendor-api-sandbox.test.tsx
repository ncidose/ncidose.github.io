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
            response: { ok: true, dose_mGy: { effective_dose_mSv: 3.251234567, brain: 0.0047328 } },
          }
        : { ok: true, usage: { used: 2, limit: 30, remaining: 28, windowMinutes: 60 }, service: { status: "available" } },
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
    expect(responseText.textContent).toContain('"brain": 0.00473');
    expect(responseText.textContent).not.toContain("3.251234567");
    expect(screen.queryByText(/Readable preview/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Show full-precision JSON/i)).not.toBeInTheDocument();
    expect(screen.getByText(/3 of 30 runs used in the last hour/i)).toBeInTheDocument();
    expect(screen.getByTestId("vendor-api-service-status")).toHaveTextContent(/NCINM API available/i);
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

  it("explains when the calculation server is likely restarting or under maintenance", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => new Response(JSON.stringify(
      options?.method === "POST"
        ? { error: "demo_server_maintenance", usage: { used: 1, limit: 30, remaining: 29, windowMinutes: 60 } }
        : { ok: true, usage: { used: 0, limit: 30, remaining: 30, windowMinutes: 60 }, service: { status: "available" } },
    ), {
      status: options?.method === "POST" ? 503 : 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<VendorApiSandbox />);
    expect(await screen.findByText(/NCICT API available/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Run NCICT demo/i }));

    expect(await screen.findByText(/likely because of maintenance or a restart/i)).toBeInTheDocument();
    expect(screen.getByText(/status will refresh automatically/i)).toBeInTheDocument();
    expect(screen.getByTestId("vendor-api-service-status")).toHaveTextContent(/temporarily unavailable/i);
    expect(screen.getByRole("button", { name: /Run NCICT demo/i })).toBeDisabled();
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
    expect(screen.getByText(/licensed NCICT API supports custom scan start and end locations at 1 cm intervals/i)).toBeInTheDocument();
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

    expect(screen.getByText("Geometry")).toBeInTheDocument();
    expect(screen.queryByText("Major input")).not.toBeInTheDocument();
    expect(screen.queryByText(/Advanced RDSR-derived geometry/i)).not.toBeInTheDocument();
    expect(screen.getByText(/5 runs \/ 30 min/i)).toBeInTheDocument();
    expect(screen.getByText(/Fast demo: 10,000 histories, 2 threads, usually under 30 seconds/i)).toBeInTheDocument();
    expect(screen.queryByText(/Particle histories \(10,000\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Case ID is synthetic/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adjust the bounded inputs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adjust phantom, spectrum/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Enter one normalized irradiation event/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /NCIRF API manual/i })).toHaveAttribute("href", "/manuals/ncirf-api");
    expect(screen.getByLabelText("Phantom library")).toBeInTheDocument();
    expect(screen.getByLabelText("Height (cm)")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight (kg)")).toBeInTheDocument();
    expect(screen.getByLabelText("Tube potential (kVp)")).toBeInTheDocument();
    expect(screen.getByLabelText("Primary angle · PPA (°)")).toBeInTheDocument();
    expect(screen.getByLabelText("Isocenter Z · ISOZ (cm)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Increase Isocenter X · ISOX by 1 cm" }));
    expect(screen.getByLabelText("Isocenter X · ISOX (cm)")).toHaveValue(18.8);
    fireEvent.click(screen.getByRole("button", { name: "Decrease Isocenter X · ISOX by 1 cm" }));
    expect(screen.getByLabelText("Isocenter X · ISOX (cm)")).toHaveValue(17.8);
    expect(screen.queryByLabelText(/histories/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/threads/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Phantom library"), { target: { value: "5" } });
    expect(screen.getByLabelText("Gestational age")).toBeInTheDocument();
    expect(screen.queryByLabelText("Height (cm)")).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel").textContent).toContain("\"Hist\": 10000");
    expect(screen.getByRole("tabpanel").textContent).toContain("\"Thread\": 2");
    expect(screen.getByText(/Larger tests require a dedicated deployment/i)).toBeInTheDocument();
  });

  it("links the NCIRF frontal field preview to field size and isocenter inputs", () => {
    render(<VendorApiSandbox initialTool="ncirf" />);

    expect(screen.getByLabelText("NCIRF phantom frontal field preview")).toBeInTheDocument();
    const phantomImage = screen.getByTestId("ncirf-frontal-phantom-image");
    expect(phantomImage).toHaveAttribute("href", "/images/ncirf/phantoms/frontal/31600502.webp");
    expect(phantomImage.closest("svg")).toHaveClass("aspect-[3/5]");
    expect(screen.queryByText(/Size-dependent · 160 cm \/ 50 kg/i)).not.toBeInTheDocument();
    expect(screen.queryByText("NCIRF4 source")).not.toBeInTheDocument();
    expect(screen.queryByText("Field")).not.toBeInTheDocument();
    expect(screen.queryByText("Center")).not.toBeInTheDocument();
    const fieldBox = screen.getByTestId("ncirf-frontal-field-box");
    const initialWidth = Number(fieldBox.getAttribute("width"));
    const initialY = Number(fieldBox.getAttribute("y"));

    fireEvent.change(screen.getByLabelText("Field width · FW (cm)"), { target: { value: "20" } });
    expect(Number(fieldBox.getAttribute("width"))).toBeGreaterThan(initialWidth);

    fireEvent.change(screen.getByLabelText("Isocenter Z · ISOZ (cm)"), { target: { value: "130" } });
    expect(Number(fieldBox.getAttribute("y"))).toBeLessThan(initialY);

    fireEvent.change(screen.getByLabelText("Phantom library"), { target: { value: "5" } });
    expect(phantomImage).toHaveAttribute("href", "/images/ncirf/phantoms/frontal/4042.webp");
  });

  it("explains licensed NCIRF custom spectra without implying the public demo supports them yet", () => {
    render(<VendorApiSandbox initialTool="ncirf" />);

    expect(screen.getByRole("heading", { name: "Custom spectrum support" })).toBeInTheDocument();
    expect(screen.getByText(/registered/i)).toBeInTheDocument();
    expect(screen.getByText("SpectrumID")).toBeInTheDocument();
    expect(screen.getByText(/This demo uses built-in kVp\/HVL spectra/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Tube potential (kVp)")).toBeEnabled();
    expect(screen.getByLabelText("HVL (mm Al)")).toBeEnabled();
    expect(screen.getByRole("tabpanel").querySelector("pre")?.textContent).not.toContain("SpectrumID");

    fireEvent.click(screen.getByRole("tab", { name: /NCICT/i }));
    expect(screen.queryByRole("heading", { name: "Custom spectrum support" })).not.toBeInTheDocument();
  });
});
