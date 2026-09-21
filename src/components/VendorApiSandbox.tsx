import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Clock3, Loader2, Play } from "lucide-react";
import {
  buildVendorApiDemoRequest,
  ncirfGpuDemoEndpoint,
  ncirfGpuDemoPresetId,
  vendorApiDemoPresetForTool,
  vendorApiDemoPresets,
  type NcirfDemoBackend,
  type VendorApiDemoPreset,
} from "@/data/vendorApiDemo";
import pregnantPhantomsCsv from "@/data/ncirf-phantoms/pregnant.csv?raw";
import referencePhantomsCsv from "@/data/ncirf-phantoms/reference.csv?raw";
import sizePhantomsCsv from "@/data/ncirf-phantoms/size.csv?raw";
import { trackVendorSandboxEvent } from "@/lib/analytics";
import { formatVendorResponse } from "@/lib/vendorResponseFormat";

const demoEndpoint =
  import.meta.env.VITE_VENDOR_DEMO_API_URL?.trim()
  || "https://portal.ncidosetools.com/api/public/vendor-demo";

type DemoResponse = {
  ok?: boolean;
  error?: string;
  retryAfter?: number;
  service?: {
    status?: "available" | "unavailable";
    checkedAt?: string;
  };
  demo?: {
    tool?: string;
    presetId?: string;
    upstreamStatus?: number;
    durationMs?: number;
    calculationDurationMs?: number | null;
    engine?: string;
    engineDetail?: string;
    histories?: number;
    psdHistories?: number;
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
  demo_server_maintenance: "The calculation server is temporarily unavailable, likely because of maintenance or a restart. Service status will refresh automatically.",
  demo_upstream_error: "The calculation server did not complete this example. Please try again later.",
  invalid_demo_parameters: "One or more demonstration inputs are outside the allowed range.",
  invalid_origin: "This demonstration can be run only from the NCI Dose Tools website.",
  too_many_demo_requests: "The demonstration request limit has been reached. Please try again later.",
};

const formattedJson = (value: unknown) => JSON.stringify(value, null, 2);

type ParameterValue = string | number;
type ServiceAvailability = "checking" | "available" | "unavailable" | "unknown";

const selectClassName = "mt-2 w-full border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400";
const numberInputClassName = "mt-2 w-full border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400";
const textInputClassName = "mt-2 w-full border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-400";

type NcirfPhantomImage = {
  fileName: string;
  heightCm: number;
  widthCm: number;
  label: string;
};

type SizePhantom = NcirfPhantomImage & {
  ageGroup: number;
  height: number;
  weight: number;
};

const csvRows = (csv: string) => csv.trim().split(/\r?\n/).map((row) => row.split(","));
const padPhantomValue = (value: number, length: number) => String(value).padStart(length, "0");

const referencePhantoms = csvRows(referencePhantomsCsv).slice(1).map((columns) => {
  const [libraryIndex, ageIndex, matrixX, , matrixZ, resolutionX, , resolutionZ] = columns.map(Number);
  return {
    libraryIndex,
    ageIndex,
    fileName: `${libraryIndex}${padPhantomValue(ageIndex, 2)}2.webp`,
    widthCm: matrixX * resolutionX,
    heightCm: matrixZ * resolutionZ,
  };
});

const sizePhantoms: SizePhantom[] = csvRows(sizePhantomsCsv).slice(1).map((columns) => {
  const ageGroup = Number(columns[0]);
  const height = Number(columns[1]);
  const weight = Number(columns[2]);
  return {
    ageGroup,
    height,
    weight,
    fileName: `${ageGroup}${padPhantomValue(height, 3)}${padPhantomValue(weight, 3)}2.webp`,
    widthCm: Number(columns[4]) * Number(columns[7]),
    heightCm: Number(columns[6]) * Number(columns[9]),
    label: `Size-dependent · ${height} cm / ${weight} kg`,
  };
});

const pregnantPhantoms = csvRows(pregnantPhantomsCsv).map((columns, index) => ({
  fileName: `4${padPhantomValue(index + 1, 2)}2.webp`,
  widthCm: Number(columns[0]) * 0.1,
  heightCm: Number(columns[2]) * 0.2,
}));

const referenceAgeGroup = (age: number) => {
  if (age < 1) return 1;
  if (age < 3) return 2;
  if (age < 8) return 3;
  if (age < 13) return 4;
  if (age < 25) return 5;
  return 6;
};

const ncirfPhantomImage = (parameters: Record<string, ParameterValue>): NcirfPhantomImage => {
  const phantomLibrary = Number(parameters.phantomLibrary);
  const sex = String(parameters.sex);
  if (phantomLibrary >= 1 && phantomLibrary <= 3) {
    const ageGroup = referenceAgeGroup(Number(parameters.age));
    const sexIndex = sex === "m" ? 2 : 1;
    const ageIndex = (ageGroup - 1) * 2 + sexIndex;
    const matched = referencePhantoms.find((phantom) => phantom.libraryIndex === phantomLibrary && phantom.ageIndex === ageIndex)
      ?? referencePhantoms[0];
    const nominalAge = [0, 1, 5, 10, 15, 35][ageGroup - 1];
    return {
      ...matched,
      label: `Reference · age ${nominalAge} · ${sex === "m" ? "male" : "female"}`,
    };
  }
  if (phantomLibrary === 5) {
    const gestationalAges = ["8wk", "10wk", "15wk", "20wk", "25wk", "30wk", "35wk", "38wk"];
    const pregnantIndex = Math.max(0, gestationalAges.indexOf(String(parameters.pregnantAge)));
    return {
      ...pregnantPhantoms[pregnantIndex],
      label: `Pregnant · ${gestationalAges[pregnantIndex]}`,
    };
  }

  const age = Number(parameters.age);
  const ageGroup = age < 20
    ? sex === "m" ? 2 : 1
    : sex === "m" ? 4 : 3;
  const height = Number(parameters.heightCm);
  const weight = Number(parameters.weightKg);
  let matched = sizePhantoms.find((phantom) => phantom.ageGroup === ageGroup) ?? sizePhantoms[0];
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const phantom of sizePhantoms) {
    if (phantom.ageGroup !== ageGroup) continue;
    const distance = Math.abs(height - phantom.height) + Math.abs(weight - phantom.weight);
    if (distance < closestDistance) {
      closestDistance = distance;
      matched = phantom;
    }
  }
  return matched;
};

const NcirfFrontalFieldPreview = ({ parameters }: { parameters: Record<string, ParameterValue> }) => {
  const phantom = ncirfPhantomImage(parameters);
  const fieldWidthCm = Math.max(0, Number(parameters.fieldWidthCm));
  const fieldHeightCm = Math.max(0, Number(parameters.fieldHeightCm));
  const isoXCm = Number(parameters.isoXCm);
  const isoZCm = Number(parameters.isoZCm);
  const ppaRadians = (180 + Number(parameters.ppaDeg)) * Math.PI / 180;
  const psaRadians = (90 - Number(parameters.psaDeg)) * Math.PI / 180;

  const viewWidth = 600;
  const viewHeight = 1000;
  const centerX = viewWidth / 2;
  const scale = viewHeight / phantom.heightCm;
  const fieldWidth = Math.max(2, fieldWidthCm * scale * Math.abs(Math.cos(ppaRadians)));
  const fieldHeight = Math.max(2, fieldHeightCm * scale * Math.abs(Math.sin(psaRadians)));
  const fieldCenterX = centerX + (isoXCm - phantom.widthCm / 2) * scale;
  const fieldCenterY = viewHeight - isoZCm * scale;
  const imagePath = `/images/ncirf/phantoms/frontal/${phantom.fileName}`;

  return (
    <figure className="border border-slate-700 bg-slate-950/60 p-3" aria-label="NCIRF phantom frontal field preview">
      <div className="font-mono text-[10px] uppercase tracking-widest text-sky-300">Frontal view</div>
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        className="mt-2 block aspect-[3/5] h-auto w-full bg-white"
        role="img"
        aria-labelledby="ncirf-field-preview-title ncirf-field-preview-description"
      >
        <title id="ncirf-field-preview-title">NCIRF frontal phantom field position</title>
        <desc id="ncirf-field-preview-description">
          Field {fieldWidthCm} by {fieldHeightCm} centimeters centered at ISOX {isoXCm} and ISOZ {isoZCm} centimeters.
        </desc>
        <rect x="0" y="0" width={viewWidth} height={viewHeight} fill="#ffffff" />
        <image
          data-testid="ncirf-frontal-phantom-image"
          href={imagePath}
          x="0"
          y="0"
          width={viewWidth}
          height={viewHeight}
          preserveAspectRatio="xMidYMid meet"
        />
        <rect
          data-testid="ncirf-frontal-field-box"
          x={fieldCenterX - fieldWidth / 2}
          y={fieldCenterY - fieldHeight / 2}
          width={fieldWidth}
          height={fieldHeight}
          fill="#38bdf8"
          fillOpacity="0.28"
          stroke="#2563eb"
          strokeWidth="6"
        />
        <line x1="0" y1={fieldCenterY} x2={viewWidth} y2={fieldCenterY} stroke="#0f172a" strokeWidth="3" strokeOpacity="0.75" />
        <line x1={fieldCenterX} y1="0" x2={fieldCenterX} y2={viewHeight} stroke="#0f172a" strokeWidth="3" strokeOpacity="0.75" />
      </svg>
    </figure>
  );
};

const NumberInput = ({
  label,
  name,
  value,
  min,
  max,
  step = 1,
  spinnerStep,
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
  spinnerStep?: number;
  unit?: string;
  disabled: boolean;
  onChange: (name: string, value: ParameterValue) => void;
}) => {
  const adjustValue = (direction: -1 | 1) => {
    if (!spinnerStep) return;
    const nextValue = Math.min(max, Math.max(min, Number(value) + direction * spinnerStep));
    onChange(name, Number(nextValue.toFixed(10)));
  };

  return (
    <label className="text-xs text-slate-300">
      {label}{unit ? ` (${unit})` : ""}
      <span className="relative block">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={spinnerStep ? "any" : step}
          disabled={disabled}
          onKeyDown={(event) => {
            if (!spinnerStep || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
            event.preventDefault();
            adjustValue(event.key === "ArrowUp" ? 1 : -1);
          }}
          onChange={(event) => onChange(name, Number(event.target.value))}
          className={`${numberInputClassName}${spinnerStep ? " pr-10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" : ""}`}
        />
        {spinnerStep && (
          <span className="absolute bottom-px right-px top-[9px] flex w-8 flex-col border-l border-slate-700 bg-slate-900">
            <button
              type="button"
              aria-label={`Increase ${label} by ${spinnerStep} ${unit ?? ""}`.trim()}
              disabled={disabled || Number(value) >= max}
              onClick={() => adjustValue(1)}
              className="flex flex-1 items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label={`Decrease ${label} by ${spinnerStep} ${unit ?? ""}`.trim()}
              disabled={disabled || Number(value) <= min}
              onClick={() => adjustValue(-1)}
              className="flex flex-1 items-center justify-center border-t border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </span>
        )}
      </span>
    </label>
  );
};

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
        <div className="border-l-2 border-sky-400 bg-sky-950/30 px-4 py-3 text-xs leading-5 text-slate-300">
          This sandbox uses preset scan protocols. The licensed NCICT API supports custom scan start and end locations at 1 cm intervals.
        </div>
        <p className="text-xs leading-5 text-slate-400">See the <a className="text-sky-300 underline decoration-sky-500/50 underline-offset-2 hover:text-white" href="/manuals/ncict-api">NCICT API manual</a>.</p>
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
        </div>
        <p className="text-xs leading-5 text-slate-400">See the <a className="text-sky-300 underline decoration-sky-500/50 underline-offset-2 hover:text-white" href="/manuals/ncinm-api">NCINM API manual</a>.</p>
      </div>
    )}
    {preset.tool === "ncirf" && (
      <div className="mt-3 space-y-5">
        <p className="text-sm leading-6 text-slate-300">
          The NCIRF API sandbox runs Geant4 Monte Carlo radiation transport on the backend.
        </p>
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
          <div className="mt-4 border-l-2 border-sky-400 bg-sky-950/30 px-4 py-3">
            <h4 className="text-sm font-medium text-sky-200">Custom spectrum support</h4>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              The licensed API accepts registered <code>.ncirfspc</code> spectra through <code>SpectrumID</code>.
              This demo uses built-in kVp/HVL spectra.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Geometry</div>
          <div className="mt-3 grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberInput label="SID" name="sidCm" value={parameters.sidCm} min={30} max={200} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Field width · FW" name="fieldWidthCm" value={parameters.fieldWidthCm} min={0.5} max={60} step={0.5} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Field height · FH" name="fieldHeightCm" value={parameters.fieldHeightCm} min={0.5} max={60} step={0.5} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Primary angle · PPA" name="ppaDeg" value={parameters.ppaDeg} min={-360} max={360} unit="°" disabled={disabled} onChange={onChange} />
              <NumberInput label="Secondary angle · PSA" name="psaDeg" value={parameters.psaDeg} min={-180} max={180} unit="°" disabled={disabled} onChange={onChange} />
              <NumberInput label="Isocenter X · ISOX" name="isoXCm" value={parameters.isoXCm} min={-100} max={150} spinnerStep={1} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Isocenter Y · ISOY" name="isoYCm" value={parameters.isoYCm} min={-100} max={150} spinnerStep={1} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Isocenter Z · ISOZ" name="isoZCm" value={parameters.isoZCm} min={-20} max={220} spinnerStep={1} unit="cm" disabled={disabled} onChange={onChange} />
              <NumberInput label="Table thickness · Tbl" name="tableCm" value={parameters.tableCm} min={0} max={15} step={0.1} unit="cm" disabled={disabled} onChange={onChange} />
            </div>
            <NcirfFrontalFieldPreview parameters={parameters} />
          </div>
        </div>

        {preset.expectedTime && (
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <Clock3 className="h-3.5 w-3.5" /> {preset.expectedTime}
          </p>
        )}
        {Number(parameters.phantomLibrary) === 5 && (
          <p className="border-l-2 border-amber-400/70 pl-3 text-xs leading-5 text-slate-300">
            Fetal dose tallies may require more histories for stable uncertainty. Large demo error values are shown unchanged.
          </p>
        )}
        <p className="text-xs leading-5 text-slate-400">See the <a className="text-sky-300 underline decoration-sky-500/50 underline-offset-2 hover:text-white" href="/manuals/ncirf-api">NCIRF API manual</a>.</p>
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
  const [activeNcirfBackend, setActiveNcirfBackend] = useState<NcirfDemoBackend>("cpu");
  const [usageByPreset, setUsageByPreset] = useState<Record<string, DemoUsage>>({});
  const [serviceAvailabilityByPreset, setServiceAvailabilityByPreset] = useState<Record<string, ServiceAvailability>>({});
  const requestSequence = useRef(0);
  const runInFlight = useRef(false);
  const selected = vendorApiDemoPresets.find((preset) => preset.id === selectedId) ?? initialPreset;
  const selectedParameters = parameterSets[selected.id] ?? selected.defaultParameters;
  const activeDemoPresetId = selected.tool === "ncirf" && activeNcirfBackend === "gpu"
    ? ncirfGpuDemoPresetId
    : selected.id;
  const displayedRequest = buildVendorApiDemoRequest(selected, selectedParameters, activeNcirfBackend);
  const displayedEndpoint = selected.tool === "ncirf" && activeNcirfBackend === "gpu"
    ? ncirfGpuDemoEndpoint
    : selected.endpoint;
  const usage = usageByPreset[activeDemoPresetId] ?? null;
  const serviceAvailability = serviceAvailabilityByPreset[activeDemoPresetId] ?? "checking";
  const activeServiceLabel = selected.tool === "ncirf"
    ? `NCIRF ${activeNcirfBackend.toUpperCase()}`
    : selected.modality;
  const rateLimitLabel = selected.tool === "ncirf" ? "5 runs / 30 min" : "30 runs / hour";
  const usageLabel = usage
    ? `${usage.used} of ${usage.limit} runs used in the last ${usage.windowMinutes === 60 ? "hour" : `${usage.windowMinutes} min`}`
    : `Limit: ${rateLimitLabel}`;

  useEffect(() => {
    const controller = new AbortController();
    const presetIds = selected.tool === "ncirf" ? [selected.id, ncirfGpuDemoPresetId] : [selected.id];
    setUsageByPreset({});
    setServiceAvailabilityByPreset(Object.fromEntries(presetIds.map((presetId) => [presetId, "checking"])));
    const refreshServiceStatus = () => {
      for (const presetId of presetIds) {
        const usageUrl = new URL(demoEndpoint, window.location.href);
        usageUrl.searchParams.set("presetId", presetId);
        fetch(usageUrl.toString(), { signal: controller.signal })
          .then(async (response) => response.ok ? response.json() as Promise<DemoResponse> : null)
          .then((payload) => {
            if (payload?.usage) setUsageByPreset((current) => ({ ...current, [presetId]: payload.usage! }));
            setServiceAvailabilityByPreset((current) => ({ ...current, [presetId]: payload?.service?.status || "unknown" }));
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              setServiceAvailabilityByPreset((current) => ({ ...current, [presetId]: "unknown" }));
            }
          });
      }
    };
    refreshServiceStatus();
    const refreshInterval = window.setInterval(refreshServiceStatus, 60_000);
    return () => {
      window.clearInterval(refreshInterval);
      controller.abort();
    };
  }, [selected.id, selected.tool]);

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
    setActiveNcirfBackend("cpu");
    setStatus("idle");
    setResult(null);
    setError("");
  };

  const runDemo = async (ncirfBackend: NcirfDemoBackend = "cpu") => {
    if (runInFlight.current) return;
    runInFlight.current = true;
    const targetPresetId = selected.tool === "ncirf" && ncirfBackend === "gpu"
      ? ncirfGpuDemoPresetId
      : selected.id;
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setActiveNcirfBackend(ncirfBackend);
    setStatus("running");
    setResult(null);
    setError("");
    trackVendorSandboxEvent("vendor_sandbox_run", selected.tool, targetPresetId);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 95_000);
    const startedAt = performance.now();

    try {
      const response = await fetch(demoEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presetId: targetPresetId, parameters: selectedParameters }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({ error: "demo_upstream_error" })) as DemoResponse;
      if (requestSequence.current !== sequence) return;
      if (payload.usage) setUsageByPreset((current) => ({ ...current, [targetPresetId]: payload.usage! }));
      if (!response.ok || payload.ok !== true) {
        const message = demoErrors[payload.error || ""] || "The live demo could not complete this request.";
        const retry = payload.retryAfter ? ` Try again in about ${Math.ceil(payload.retryAfter / 60)} minutes.` : "";
        if (payload.error === "demo_server_maintenance") {
          setServiceAvailabilityByPreset((current) => ({ ...current, [targetPresetId]: "unavailable" }));
        }
        setError(`${message}${retry}`);
        setStatus("error");
        trackVendorSandboxEvent("vendor_sandbox_error", selected.tool, targetPresetId, response.status);
        return;
      }
      setResult(payload);
      setStatus("success");
      trackVendorSandboxEvent(
        "vendor_sandbox_success",
        selected.tool,
        targetPresetId,
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
      trackVendorSandboxEvent("vendor_sandbox_error", selected.tool, targetPresetId, 0);
    } finally {
      runInFlight.current = false;
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
                <ParameterControls preset={selected} parameters={selectedParameters} disabled={status === "running"} onChange={updateParameter} />
                <details>
                  <summary className="cursor-pointer px-5 py-4 font-mono text-xs text-sky-300 hover:text-white">View request JSON</summary>
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 border-y border-slate-700 px-5 py-3 font-mono text-xs"><span className="text-emerald-300">POST</span><span className="break-all text-slate-200">{displayedEndpoint}</span></div>
                  <pre className="whitespace-pre-wrap break-words p-5 text-xs leading-relaxed text-slate-200"><code>{formattedJson(displayedRequest)}</code></pre>
                </details>
              </div>

              <div className="flex min-h-[430px] flex-col bg-white text-slate-900">
                <div className="flex min-h-[74px] items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
                      Live JSON response
                    </div>
                    <div
                      className={`mt-1.5 inline-flex items-center gap-1.5 text-xs ${
                        serviceAvailability === "available"
                          ? "text-emerald-700"
                          : serviceAvailability === "unavailable"
                            ? "text-amber-700"
                            : "text-slate-500"
                      }`}
                      role="status"
                      aria-live="polite"
                      data-testid="vendor-api-service-status"
                    >
                      {serviceAvailability === "checking" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {serviceAvailability === "available" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {serviceAvailability === "unavailable" && <AlertCircle className="h-3.5 w-3.5" />}
                      <span>{serviceAvailability === "checking"
                        ? `Checking ${activeServiceLabel} API availability…`
                        : serviceAvailability === "available"
                          ? `${activeServiceLabel} API available`
                          : serviceAvailability === "unavailable"
                            ? `${activeServiceLabel} API temporarily unavailable`
                            : `${activeServiceLabel} API status unavailable`}</span>
                    </div>
                    {result?.demo?.durationMs !== undefined && selected.tool !== "ncirf" && (
                      <p className="mt-1 text-xs text-slate-500">
                        Upstream HTTP {result.demo.upstreamStatus} · {result.demo.durationMs.toLocaleString()} ms
                      </p>
                    )}
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1.5">
                    <div className="flex flex-wrap justify-end gap-2">
                      {selected.tool === "ncirf" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => runDemo("cpu")}
                            disabled={status === "running" || serviceAvailabilityByPreset[selected.id] === "unavailable"}
                            className="inline-flex flex-none items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            data-analytics-location="vendor_api_sandbox"
                            data-analytics-tool={selected.tool}
                            data-analytics-audience="vendor"
                            data-analytics-action="run_live_demo"
                          >
                            {status === "running" && activeNcirfBackend === "cpu" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                            {status === "running" && activeNcirfBackend === "cpu" ? "Running" : "Run NCIRF demo"}
                          </button>
                          <button
                            type="button"
                            onClick={() => runDemo("gpu")}
                            disabled={status === "running" || serviceAvailabilityByPreset[ncirfGpuDemoPresetId] === "unavailable"}
                            className="btn-precision inline-flex flex-none items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                            data-analytics-location="vendor_api_sandbox"
                            data-analytics-tool="ncirfgpu"
                            data-analytics-audience="vendor"
                            data-analytics-action="run_live_demo"
                          >
                            {status === "running" && activeNcirfBackend === "gpu" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                            {status === "running" && activeNcirfBackend === "gpu" ? "Running" : "Run NCIRF GPU demo"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => runDemo()}
                          disabled={status === "running" || serviceAvailability === "unavailable"}
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
                      )}
                    </div>
                    <p className="text-right text-[11px] text-slate-500" aria-live="polite">{usageLabel}</p>
                  </div>
                </div>

                {status === "idle" && (
                  <div className="flex flex-1 flex-col items-center justify-center px-8 py-14 text-center">
                    {serviceAvailability === "unavailable" ? (
                      <>
                        <AlertCircle className="h-9 w-9 text-amber-500" />
                        <p className="mt-5 text-sm font-medium text-slate-800">The {activeServiceLabel} calculation service is temporarily unavailable.</p>
                        <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">The server may be restarting or under maintenance. This status refreshes automatically.</p>
                      </>
                    ) : <Play className="h-9 w-9 text-slate-300" />}
                  </div>
                )}

                {status === "running" && (
                  <div className="flex flex-1 flex-col items-center justify-center px-8 py-14 text-center" aria-live="polite">
                    <Loader2 className="h-9 w-9 animate-spin text-primary" />
                    <p className="mt-5 text-sm text-slate-700">Running {activeServiceLabel} on the live API…</p>
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
                    {result?.demo?.engine && (
                      <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-end">
                        <div>
                          <div className="font-mono text-[11px] uppercase tracking-widest text-primary">{result.demo.engine}</div>
                          <p className="mt-1 text-xs text-slate-600">{result.demo.engineDetail}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            {result.demo.histories?.toLocaleString()} histories
                            {result.demo.psdHistories ? ` · PSD ${result.demo.psdHistories.toLocaleString()}` : ""}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Calculation time</div>
                          <div className="mt-1 text-3xl font-semibold tabular-nums text-slate-950">
                            {((result.demo.calculationDurationMs ?? result.demo.durationMs ?? 0) / 1000).toFixed(1)} s
                          </div>
                        </div>
                      </div>
                    )}
                    <pre className="whitespace-pre-wrap break-words p-5 text-xs leading-relaxed text-slate-800 sm:text-sm">
                      <code>{formatVendorResponse(responseBody, selected.tool)}</code>
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
