import { useEffect, useMemo, useRef, useState } from "react";
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
  usage?: DemoUsage;
};

type DemoUsage = {
  used: number;
  limit: number;
  remaining: number;
  windowMinutes: number;
};

const demoErrors: Record<string, string> = {
  demo_busy: "This demo calculator is already running. Please try again shortly.",
  demo_not_configured: "The live demo is temporarily unavailable.",
  demo_upstream_error: "The calculation server did not complete this example. Please try again later.",
  invalid_demo_parameters: "One or more demonstration inputs are outside the allowed range.",
  invalid_origin: "This demonstration can be run only from the NCI Dose Tools website.",
  too_many_demo_requests: "The demonstration request limit has been reached. Please try again later.",
};

const formattedJson = (value: unknown) => JSON.stringify(value, null, 2);

type ParameterValue = string | number;

const selectClassName = "mt-2 w-full border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400";
const numberInputClassName = "mt-2 w-full border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400";
const textInputClassName = "mt-2 w-full border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-400";

const NumberInput = ({
  label,
  name,
  value,
  min,
  max,
  step = 1,
  unit,
  disabled,
  onChange,
}: {
  label: string;
  name: string;
  value: ParameterValue;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled: boolean;
  onChange: (name: string, value: ParameterValue) => void;
}) => (
  <label className="text-xs text-slate-300">
    {label}{unit ? ` (${unit})` : ""}
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(event) => onChange(name, Number(event.target.value))}
      className={numberInputClassName}
    />
  </label>
);

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
      <div className="mt-3 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-slate-300">Scan protocol<select value={parameters.protocol} disabled={disabled} onChange={(event) => onChange("protocol", event.target.value)} className={selectClassName}><option value="head">Head</option><option value="neck">Neck</option><option value="chest">Chest</option><option value="abdomen">Abdomen</option><option value="pelvis">Pelvis</option><option value="abdomenPelvis">Abdomen–pelvis</option><option value="cap">Chest–abdomen–pelvis</option><option value="wholeBody">Whole body</option></select></label>
          <label className="text-xs text-slate-300"><span className="flex justify-between gap-3"><span>CTDIvol</span><output>{parameters.ctdivol} mGy</output></span><input type="range" min="1" max="50" step="1" value={parameters.ctdivol} disabled={disabled} onChange={(event) => onChange("ctdivol", Number(event.target.value))} className="mt-3 w-full accent-sky-400" /></label>
          <NumberInput label="Age" name="age" value={parameters.age} min={0} max={90} unit="years" disabled={disabled} onChange={onChange} />
          <label className="text-xs text-slate-300">Sex<select value={parameters.sex} disabled={disabled} onChange={(event) => onChange("sex", event.target.value)} className={selectClassName}><option value="f">Female</option><option value="m">Male</option></select></label>
          <label className="text-xs text-slate-300">Body-size matching<select value={parameters.bodySizeMethod} disabled={disabled} onChange={(event) => onChange("bodySizeMethod", event.target.value)} className={selectClassName}><option value="age-sex">Age and sex</option><option value="wed">Water-equivalent diameter</option><option value="height-weight">Height and weight</option></select></label>
          {parameters.bodySizeMethod === "wed" && (
            <NumberInput label="Water-equivalent diameter · WED" name="wedCm" value={parameters.wedCm} min={5} max={80} step={0.1} unit="cm" disabled={disabled} onChange={onChange} />
          )}
          {parameters.bodySizeMethod === "height-weight" && (
            <>
              <NumberInput label="Height" name="heightCm" value={parameters.heightCm} min={40} max={220} step={0.1} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Weight" name="weightKg" value={parameters.weightKg} min={2} max={300} step={0.1} unit="kg" disabled={disabled} onChange={onChange} />
            </>
          )}
          <label className="text-xs text-slate-300">Tube potential<select value={parameters.kvp} disabled={disabled} onChange={(event) => onChange("kvp", Number(event.target.value))} className={selectClassName}>{[80, 100, 120, 140].map((kvp) => <option key={kvp} value={kvp}>{kvp} kVp</option>)}</select></label>
          <label className="text-xs text-slate-300">CTDI phantom<select value={parameters.headBody} disabled={disabled} onChange={(event) => onChange("headBody", Number(event.target.value))} className={selectClassName}><option value={1}>16-cm head</option><option value={2}>32-cm body</option></select></label>
          <label className="text-xs text-slate-300 sm:col-span-3"><span className="flex justify-between gap-3"><span>Tube current modulation strength</span><output>{Number(parameters.tcmStrength).toFixed(1)}</output></span><input type="range" min="0" max="1" step="0.1" value={parameters.tcmStrength} disabled={disabled} onChange={(event) => onChange("tcmStrength", Number(event.target.value))} className="mt-3 w-full accent-sky-400" /></label>
        </div>
        <p className="text-xs leading-5 text-slate-400">Choose age/sex, WED, or height/weight phantom matching as documented in the <a className="text-sky-300 underline decoration-sky-500/50 underline-offset-2 hover:text-white" href="/manuals/ncict-api">NCICT API manual</a>.</p>
        {parameters.bodySizeMethod === "wed" && !["chest", "abdomen", "pelvis", "abdomenPelvis", "cap"].includes(String(parameters.protocol)) && (
          <p className="text-xs leading-5 text-amber-200">WED matching is applied only to supported chest, abdomen, pelvis, AP, and CAP landmark ranges; other ranges fall back to age/sex matching.</p>
        )}
      </div>
    )}
    {preset.tool === "ncinm" && (
      <div className="mt-3 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-300">
            Radiopharmaceutical name
            <input type="text" value={parameters.radiopharmaceutical} maxLength={120} placeholder="e.g., Tc99m MDP bone scan" disabled={disabled} onChange={(event) => onChange("radiopharmaceutical", event.target.value)} className={textInputClassName} />
          </label>
          <label className="text-xs text-slate-300"><span className="flex justify-between gap-3"><span>Administered activity</span><output>{parameters.administeredActivityMbq} MBq</output></span><input type="range" min="10" max="1000" step="10" value={parameters.administeredActivityMbq} disabled={disabled} onChange={(event) => onChange("administeredActivityMbq", Number(event.target.value))} className="mt-3 w-full accent-sky-400" /></label>
          <label className="text-xs text-slate-300">Phantom library<select value={parameters.phantomLibrary} disabled={disabled} onChange={(event) => onChange("phantomLibrary", Number(event.target.value))} className={selectClassName}><option value={1}>NCI</option><option value={2}>ICRP</option></select></label>
          <label className="text-xs text-slate-300">Sex<select value={parameters.sex} disabled={disabled} onChange={(event) => onChange("sex", event.target.value)} className={selectClassName}><option value="female">Female</option><option value="male">Male</option></select></label>
          <label className="text-xs text-slate-300 sm:col-span-2"><span className="flex justify-between gap-3"><span>Age</span><output>{parameters.age} years</output></span><input type="range" min="0" max="90" step="1" value={parameters.age} disabled={disabled} onChange={(event) => onChange("age", Number(event.target.value))} className="mt-3 w-full accent-sky-400" /></label>
          <p className="text-xs leading-5 text-slate-400 sm:col-span-2">Try a library name, ID, alternate radionuclide notation, or clinical-style text. The response reports the original text, matched entry, method, and score.</p>
        </div>
        <p className="text-xs leading-5 text-slate-400">Match phantom and patient settings using the <a className="text-sky-300 underline decoration-sky-500/50 underline-offset-2 hover:text-white" href="/manuals/ncinm-api">NCINM API manual</a>.</p>
      </div>
    )}
    {preset.tool === "ncirf" && (
      <div className="mt-3 space-y-5">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Phantom</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300">
              Phantom library
              <select value={parameters.phantomLibrary} disabled={disabled} onChange={(event) => onChange("phantomLibrary", Number(event.target.value))} className={selectClassName}>
                <option value={1}>Reference · arms raised</option>
                <option value={2}>Reference · arms lowered</option>
                <option value={3}>Reference · arms rotated</option>
                <option value={4}>Size-dependent</option>
                <option value={5}>Pregnant</option>
              </select>
            </label>
            {Number(parameters.phantomLibrary) === 5 ? (
              <label className="text-xs text-slate-300">
                Gestational age
                <select value={parameters.pregnantAge} disabled={disabled} onChange={(event) => onChange("pregnantAge", event.target.value)} className={selectClassName}>
                  {["8wk", "10wk", "15wk", "20wk", "25wk", "30wk", "35wk", "38wk"].map((age) => <option key={age} value={age}>{age}</option>)}
                </select>
              </label>
            ) : (
              <NumberInput label="Age" name="age" value={parameters.age} min={0} max={90} disabled={disabled} onChange={onChange} />
            )}
            {Number(parameters.phantomLibrary) !== 5 && (
              <label className="text-xs text-slate-300">
                Sex
                <select value={parameters.sex} disabled={disabled} onChange={(event) => onChange("sex", event.target.value)} className={selectClassName}>
                  <option value="f">Female</option>
                  <option value="m">Male</option>
                </select>
              </label>
            )}
            {Number(parameters.phantomLibrary) === 4 && (
              <>
                <NumberInput label="Height" name="heightCm" value={parameters.heightCm} min={50} max={210} unit="cm" disabled={disabled} onChange={onChange} />
                <NumberInput label="Weight" name="weightKg" value={parameters.weightKg} min={3} max={200} unit="kg" disabled={disabled} onChange={onChange} />
              </>
            )}
          </div>
        </div>

        <div className="border-t border-slate-700 pt-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Exposure</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberInput label="Tube potential" name="kvp" value={parameters.kvp} min={20} max={150} unit="kVp" disabled={disabled} onChange={onChange} />
            <NumberInput label="HVL" name="hvlMmAl" value={parameters.hvlMmAl} min={0.1} max={20} step={0.01} unit="mm Al" disabled={disabled} onChange={onChange} />
            <NumberInput label="Dose-area product" name="dapGyCm2" value={parameters.dapGyCm2} min={0.1} max={1000} step={0.1} unit="Gy·cm²" disabled={disabled} onChange={onChange} />
          </div>
        </div>

        <details className="border border-slate-700 bg-slate-950/30">
          <summary className="cursor-pointer px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-sky-300 hover:text-white">Advanced RDSR-derived geometry</summary>
          <div className="border-t border-slate-700 p-4">
            <p className="text-xs leading-5 text-slate-400">
              Enter one normalized irradiation event from your RDSR workflow. Confirm NCIRF angle and phantom-coordinate conventions in the{" "}
              <a className="text-sky-300 underline decoration-sky-500/50 underline-offset-2 hover:text-white" href="/manuals/ncirf-api">NCIRF API manual</a>.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <NumberInput label="SID" name="sidCm" value={parameters.sidCm} min={30} max={200} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Field width · FW" name="fieldWidthCm" value={parameters.fieldWidthCm} min={0.5} max={60} step={0.5} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Field height · FH" name="fieldHeightCm" value={parameters.fieldHeightCm} min={0.5} max={60} step={0.5} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Primary angle · PPA" name="ppaDeg" value={parameters.ppaDeg} min={-360} max={360} unit="°" disabled={disabled} onChange={onChange} />
              <NumberInput label="Secondary angle · PSA" name="psaDeg" value={parameters.psaDeg} min={-180} max={180} unit="°" disabled={disabled} onChange={onChange} />
              <NumberInput label="Isocenter X · ISOX" name="isoXCm" value={parameters.isoXCm} min={-100} max={150} step={0.1} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Isocenter Y · ISOY" name="isoYCm" value={parameters.isoYCm} min={-100} max={150} step={0.1} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Isocenter Z · ISOZ" name="isoZCm" value={parameters.isoZCm} min={-20} max={220} step={0.1} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Table thickness · Tbl" name="tableCm" value={parameters.tableCm} min={0} max={15} step={0.1} unit="cm" disabled={disabled} onChange={onChange} />
            </div>
          </div>
        </details>

        <p className="text-xs leading-5 text-slate-400">Case ID is synthetic. Particle histories (25,000) and threads (2) are fixed for a functional demonstration. Higher-history or scaled testing requires an approved dedicated vendor deployment.</p>
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
  const [usage, setUsage] = useState<DemoUsage | null>(null);
  const requestSequence = useRef(0);
  const selected = vendorApiDemoPresets.find((preset) => preset.id === selectedId) ?? initialPreset;
  const selectedParameters = parameterSets[selected.id] ?? selected.defaultParameters;
  const displayedRequest = buildVendorApiDemoRequest(selected, selectedParameters);
  const rateLimitLabel = selected.tool === "ncirf" ? "5 runs / 30 min" : "30 runs / hour";
  const usageLabel = usage
    ? `${usage.used} of ${usage.limit} runs used in the last ${usage.windowMinutes === 60 ? "hour" : `${usage.windowMinutes} min`}`
    : `Limit: ${rateLimitLabel}`;

  useEffect(() => {
    const controller = new AbortController();
    setUsage(null);
    const usageUrl = new URL(demoEndpoint, window.location.href);
    usageUrl.searchParams.set("tool", selected.tool);
    fetch(usageUrl.toString(), { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<DemoResponse> : null)
      .then((payload) => {
        if (payload?.usage) setUsage(payload.usage);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [selected.tool]);

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
      if (payload.usage) setUsage(payload.usage);
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
            <h2 className="mt-4 text-section-md text-white lg:text-section">Try the APIs live</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Adjust the inputs to match a single de-identified case. No account or API key is required.
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
                  <pre className="whitespace-pre-wrap break-words p-5 text-xs leading-relaxed text-slate-200"><code>{formattedJson(displayedRequest)}</code></pre>
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
                  <div className="flex flex-none flex-col items-end gap-1.5">
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
                    <p className="text-right text-[11px] text-slate-500" aria-live="polite">{usageLabel}</p>
                  </div>
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
                    <pre className="whitespace-pre-wrap break-words p-5 text-xs leading-relaxed text-slate-800 sm:text-sm">
                      <code>{formattedJson(responseBody)}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-400">
            Technical testing only · Single-case requests · No identifiers · No production or clinical use · No SLA
          </p>
        </div>
      </div>
    </section>
  );
};
