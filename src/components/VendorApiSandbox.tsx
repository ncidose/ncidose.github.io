import { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, Play } from "lucide-react";
import { buildVendorApiDemoRequest, vendorApiDemoPresetForTool, vendorApiDemoPresets, type VendorApiDemoPreset } from "@/data/vendorApiDemo";
import { trackVendorSandboxEvent } from "@/lib/analytics";

const demoEndpoint =
  import.meta.env.VITE_VENDOR_DEMO_API_URL?.trim()
  || "https://portal.ncidosetools.com/api/public/vendor-demo";

type DemoResponse = {
  ok?: boolean;
  error?: string;
  retryAfter?: number;
  demo?: {
    tool?: string;
    presetId?: string;
    upstreamStatus?: number;
    durationMs?: number;
    completedAt?: string;
  };
  request?: Record<string, unknown>;
  response?: unknown;
};

const demoErrors: Record<string, string> = {
  demo_busy: "This demo calculator is already running. Please try again shortly.",
  demo_not_configured: "The live demo is temporarily unavailable.",
  demo_upstream_error: "The calculation server did not complete this example. Please try again later.",
  invalid_demo_parameters: "One or more demonstration inputs are outside the allowed range.",
  invalid_origin: "This demonstration can be run only from the NCI Dose Tools website.",
  too_many_demo_requests: "The hourly demonstration limit has been reached. Please try again later.",
};

const formattedJson = (value: unknown) => JSON.stringify(value, null, 2);

type ParameterValue = string | number;

const selectClassName = "mt-2 w-full border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400";

const ParameterControls = ({
  preset,
  parameters,
  disabled,
  onChange,
}: {
  preset: VendorApiDemoPreset;
  parameters: Record<string, ParameterValue>;
  disabled: boolean;
  onChange: (name: string, value: ParameterValue) => void;
}) => (
  <div className="border-b border-slate-700 bg-slate-800/40 px-5 py-4">
    <div className="font-mono text-[11px] uppercase tracking-widest text-sky-300">Adjustable demo inputs</div>
    {preset.tool === "ncict" && (
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-300">Age<select value={parameters.age} disabled={disabled} onChange={(event) => onChange("age", Number(event.target.value))} className={selectClassName}>{[5, 10, 15, 20, 40, 60].map((age) => <option key={age} value={age}>{age} years</option>)}</select></label>
        <label className="text-xs text-slate-300">Sex<select value={parameters.sex} disabled={disabled} onChange={(event) => onChange("sex", event.target.value)} className={selectClassName}><option value="f">Female</option><option value="m">Male</option></select></label>
        <label className="text-xs text-slate-300">Scan protocol<select value={parameters.protocol} disabled={disabled} onChange={(event) => onChange("protocol", event.target.value)} className={selectClassName}><option value="head">Head</option><option value="chest">Chest</option><option value="abdomen">Abdomen</option><option value="pelvis">Pelvis</option><option value="cap">Chest–abdomen–pelvis</option></select></label>
        <label className="text-xs text-slate-300">Tube potential<select value={parameters.kvp} disabled={disabled} onChange={(event) => onChange("kvp", Number(event.target.value))} className={selectClassName}>{[80, 100, 120, 140].map((kvp) => <option key={kvp} value={kvp}>{kvp} kVp</option>)}</select></label>
        <label className="text-xs text-slate-300 sm:col-span-2"><span className="flex justify-between gap-3"><span>CTDIvol</span><output>{parameters.ctdivol} mGy</output></span><input type="range" min="1" max="50" step="1" value={parameters.ctdivol} disabled={disabled} onChange={(event) => onChange("ctdivol", Number(event.target.value))} className="mt-2 w-full accent-sky-400" /></label>
      </div>
    )}
    {preset.tool === "ncinm" && (
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-300">Phantom library<select value={parameters.phantomLibrary} disabled={disabled} onChange={(event) => onChange("phantomLibrary", Number(event.target.value))} className={selectClassName}><option value={1}>NCI</option><option value={2}>ICRP</option></select></label>
        <label className="text-xs text-slate-300">Sex<select value={parameters.sex} disabled={disabled} onChange={(event) => onChange("sex", event.target.value)} className={selectClassName}><option value="female">Female</option><option value="male">Male</option></select></label>
        <label className="text-xs text-slate-300 sm:col-span-2"><span className="flex justify-between gap-3"><span>Age</span><output>{parameters.age} years</output></span><input type="range" min="0" max="90" step="1" value={parameters.age} disabled={disabled} onChange={(event) => onChange("age", Number(event.target.value))} className="mt-2 w-full accent-sky-400" /></label>
        <label className="text-xs text-slate-300 sm:col-span-2"><span className="flex justify-between gap-3"><span>Administered activity</span><output>{parameters.administeredActivityMbq} MBq</output></span><input type="range" min="10" max="1000" step="10" value={parameters.administeredActivityMbq} disabled={disabled} onChange={(event) => onChange("administeredActivityMbq", Number(event.target.value))} className="mt-2 w-full accent-sky-400" /></label>
      </div>
    )}
    {preset.tool === "ncirf" && (
      <div className="mt-3">
        <label className="text-xs text-slate-300"><span className="flex justify-between gap-3"><span>Dose-area product</span><output>{parameters.dapGyCm2} Gy·cm²</output></span><input type="range" min="1" max="100" step="1" value={parameters.dapGyCm2} disabled={disabled} onChange={(event) => onChange("dapGyCm2", Number(event.target.value))} className="mt-2 w-full accent-sky-400" /></label>
        <p className="mt-3 text-xs leading-5 text-slate-400">Geometry, phantom, particle history, and thread count remain fixed to bound server load.</p>
      </div>
    )}
  </div>
);

export const VendorApiSandbox = ({ initialTool }: { initialTool?: string | null }) => {
  const initialPreset = useMemo(() => vendorApiDemoPresetForTool(initialTool), [initialTool]);
  const [selectedId, setSelectedId] = useState(initialPreset.id);
  const [parameterSets, setParameterSets] = useState<Record<string, Record<string, ParameterValue>>>(() =>
    Object.fromEntries(vendorApiDemoPresets.map((preset) => [preset.id, { ...preset.defaultParameters }])),
  );
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [result, setResult] = useState<DemoResponse | null>(null);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);
  const selected = vendorApiDemoPresets.find((preset) => preset.id === selectedId) ?? initialPreset;
  const selectedParameters = parameterSets[selected.id] ?? selected.defaultParameters;
  const displayedRequest = buildVendorApiDemoRequest(selected, selectedParameters);

  const updateParameter = (name: string, value: ParameterValue) => {
    setParameterSets((current) => ({
      ...current,
      [selected.id]: { ...(current[selected.id] ?? selected.defaultParameters), [name]: value },
    }));
    setStatus("idle");
    setResult(null);
    setError("");
  };

  const selectPreset = (presetId: string) => {
    if (status === "running") return;
    requestSequence.current += 1;
    setSelectedId(presetId);
    setStatus("idle");
    setResult(null);
    setError("");
  };

  const runDemo = async () => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setStatus("running");
    setResult(null);
    setError("");
    trackVendorSandboxEvent("vendor_sandbox_run", selected.tool, selected.id);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 95_000);
    const startedAt = performance.now();

    try {
      const response = await fetch(demoEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presetId: selected.id, parameters: selectedParameters }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({ error: "demo_upstream_error" })) as DemoResponse;
      if (requestSequence.current !== sequence) return;
      if (!response.ok || payload.ok !== true) {
        const message = demoErrors[payload.error || ""] || "The live demo could not complete this request.";
        const retry = payload.retryAfter ? ` Try again in about ${Math.ceil(payload.retryAfter / 60)} minutes.` : "";
        setError(`${message}${retry}`);
        setStatus("error");
        trackVendorSandboxEvent("vendor_sandbox_error", selected.tool, selected.id, response.status);
        return;
      }
      setResult(payload);
      setStatus("success");
      trackVendorSandboxEvent(
        "vendor_sandbox_success",
        selected.tool,
        selected.id,
        payload.demo?.upstreamStatus ?? response.status,
        Math.round(performance.now() - startedAt),
      );
    } catch (caught) {
      if (requestSequence.current !== sequence) return;
      const timedOut = caught instanceof DOMException && caught.name === "AbortError";
      setError(timedOut
        ? "The live calculation took too long to complete. Please try again later."
        : "The live demo could not reach the calculation service.");
      setStatus("error");
      trackVendorSandboxEvent("vendor_sandbox_error", selected.tool, selected.id, 0);
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const responseBody = result?.response;

  return (
    <section id="api-sandbox" className="scroll-mt-24 border-y border-border bg-slate-950 py-20 text-white">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <span className="font-mono text-xs uppercase tracking-widest text-sky-300">Live Vendor Sandbox</span>
            <h2 className="mt-4 text-section-md text-white lg:text-section">Try the APIs with a sample case</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Select a tool, adjust a few safe inputs, and run a live calculation—no account or API key required.
            </p>
          </div>

          <div className="mt-10 overflow-hidden border border-slate-700 bg-slate-900">
            <div className="grid border-b border-slate-700 sm:grid-cols-3" role="tablist" aria-label="Dose API demos">
              {vendorApiDemoPresets.map((preset) => {
                const selectedTab = preset.id === selected.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedTab}
                    aria-controls="vendor-api-demo-panel"
                    disabled={status === "running"}
                    onClick={() => selectPreset(preset.id)}
                    className={`border-b px-5 py-4 text-left transition-colors sm:border-b-0 sm:border-r last:border-0 ${
                      selectedTab
                        ? "border-sky-400 bg-sky-400/10 text-white"
                        : "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span className="block font-mono text-xs uppercase tracking-widest text-sky-300">
                      {preset.modality}
                    </span>
                    <span className="mt-1 block text-sm">{preset.name}</span>
                  </button>
                );
              })}
            </div>

            <div id="vendor-api-demo-panel" role="tabpanel" className="grid lg:grid-cols-2">
              <div className="border-b border-slate-700 lg:border-b-0 lg:border-r">
                <div className="border-b border-slate-700 px-5 py-4">
                  <div className="font-mono text-[11px] uppercase tracking-widest text-sky-300">
                    Sample case
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{selected.description}</p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <Clock3 className="h-3.5 w-3.5" /> {selected.expectedTime}
                  </p>
                </div>
                <ParameterControls preset={selected} parameters={selectedParameters} disabled={status === "running"} onChange={updateParameter} />
                <details>
                  <summary className="cursor-pointer px-5 py-4 font-mono text-xs text-sky-300 hover:text-white">View request JSON</summary>
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 border-y border-slate-700 px-5 py-3 font-mono text-xs"><span className="text-emerald-300">POST</span><span className="break-all text-slate-200">{selected.endpoint}</span></div>
                  <pre className="max-h-[260px] overflow-auto p-5 text-xs leading-relaxed text-slate-200"><code>{formattedJson(displayedRequest)}</code></pre>
                </details>
              </div>

              <div className="flex min-h-[430px] flex-col bg-white text-slate-900">
                <div className="flex min-h-[74px] items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
                      Live JSON response
                    </div>
                    {result?.demo?.durationMs !== undefined && (
                      <p className="mt-1 text-xs text-slate-500">
                        Upstream HTTP {result.demo.upstreamStatus} · {result.demo.durationMs.toLocaleString()} ms
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={runDemo}
                    disabled={status === "running"}
                    className="btn-precision inline-flex flex-none items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                    data-analytics-location="vendor_api_sandbox"
                    data-analytics-tool={selected.tool}
                    data-analytics-audience="vendor"
                    data-analytics-action="run_live_demo"
                  >
                    {status === "running" ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Running</>
                    ) : (
                      <><Play className="h-4 w-4" /> Run {selected.modality} demo</>
                    )}
                  </button>
                </div>

                {status === "idle" && (
                  <div className="flex flex-1 flex-col items-center justify-center px-8 py-14 text-center">
                    <Play className="h-9 w-9 text-slate-300" />
                    <p className="mt-5 max-w-sm text-sm leading-6 text-slate-600">
                      Adjust the bounded inputs, then run the example to see the calculation server's unedited JSON response.
                    </p>
                  </div>
                )}

                {status === "running" && (
                  <div className="flex flex-1 flex-col items-center justify-center px-8 py-14 text-center" aria-live="polite">
                    <Loader2 className="h-9 w-9 animate-spin text-primary" />
                    <p className="mt-5 text-sm text-slate-700">Running {selected.modality} on the live API…</p>
                    <p className="mt-2 text-xs text-slate-500">Keep this page open while the calculation completes.</p>
                  </div>
                )}

                {status === "error" && (
                  <div className="m-5 border border-red-200 bg-red-50 p-5" role="alert">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-red-700" />
                      <div>
                        <h3 className="font-medium text-red-950">Demo request not completed</h3>
                        <p className="mt-2 text-sm leading-6 text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {status === "success" && (
                  <div className="min-h-0 flex-1">
                    <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900" role="status">
                      <CheckCircle2 className="h-4 w-4" /> Live calculation completed
                    </div>
                    <pre className="h-[360px] overflow-auto p-5 text-xs leading-relaxed text-slate-800 sm:text-sm">
                      <code>{formattedJson(responseBody)}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2 text-sm leading-6 text-slate-300 sm:flex-row sm:items-start sm:justify-between">
            <p>Use the same hypothetical inputs in your current solution for a side-by-side technical comparison with the live result shown above.</p>
            <p className="flex-none text-xs text-slate-400">Rate-limited · No identifiers · Not for clinical use</p>
          </div>
        </div>
      </div>
    </section>
  );
};
