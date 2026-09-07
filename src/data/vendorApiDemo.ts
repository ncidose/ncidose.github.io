export type VendorApiDemoTool = "ncict" | "ncinm" | "ncirf";

export type VendorApiDemoPreset = {
  id: string;
  tool: VendorApiDemoTool;
  name: string;
  modality: string;
  description: string;
  endpoint: string;
  request: Record<string, unknown>;
  defaultParameters: Record<string, string | number>;
  expectedTime: string;
};

export const vendorApiDemoPresets: VendorApiDemoPreset[] = [
  {
    id: "ncict-adult-chest",
    tool: "ncict",
    name: "Adult chest CT",
    modality: "NCICT",
    description:
      "Starts with an adult female chest CT case using landmark-based scan coverage.",
    endpoint: "https://ncict-api.ncidosetools.com/param",
    request: {
      age: 40,
      sex: "f",
      start: 1004,
      end: 1007,
      kvp: 120,
      tcm_strength: 0,
      head_body: 2,
      ctdivol: 10,
    },
    defaultParameters: {
      age: 40,
      sex: "f",
      protocol: "chest",
      kvp: 120,
      ctdivol: 10,
    },
    expectedTime: "Usually completes in a few seconds",
  },
  {
    id: "ncinm-fdg-adult",
    tool: "ncinm",
    name: "Adult F-18 FDG",
    modality: "NCINM",
    description:
      "Starts with an adult female radiopharmaceutical case and demonstrates name matching.",
    endpoint: "https://ncinm-api.ncidosetools.com/param",
    request: {
      phantom_library: 2,
      sex: "female",
      age: 58,
      radiopharmaceutical: "F-18 FDG",
      administered_activity_mbq: 200,
    },
    defaultParameters: {
      phantomLibrary: 2,
      sex: "female",
      age: 58,
      administeredActivityMbq: 200,
    },
    expectedTime: "Usually completes in a few seconds",
  },
  {
    id: "ncirf-size-demo",
    tool: "ncirf",
    name: "Size-matched projection",
    modality: "NCIRF",
    description:
      "Runs a reduced-history, fixed projection case to demonstrate the GEANT4-backed response.",
    endpoint: "https://ncirf-api.ncidosetools.com/param",
    request: {
      ID: "public-vendor-demo",
      PhtLib: 4,
      Age: 30,
      Sex: "f",
      HT: 150,
      WT: 40,
      kVp: 28,
      HVL: 0.46,
      SID: 80,
      FW: 10,
      FH: 10,
      DAP: 100,
      PPA: 180,
      PSA: 0,
      ISOX: 16.5,
      ISOY: 13.7,
      ISOZ: 75.1,
      Tbl: 1,
      Hist: 100000,
      Thread: 2,
    },
    defaultParameters: {
      dapGyCm2: 100,
    },
    expectedTime: "May take up to about one minute",
  },
];

export const vendorApiDemoPresetForTool = (tool?: string | null) =>
  vendorApiDemoPresets.find((preset) => preset.tool === tool) ?? vendorApiDemoPresets[0];

const protocolRanges: Record<string, [number, number]> = {
  head: [1001, 1003],
  chest: [1004, 1007],
  abdomen: [1006, 1008],
  pelvis: [1008, 1009],
  cap: [1004, 1009],
};

export const buildVendorApiDemoRequest = (
  preset: VendorApiDemoPreset,
  parameters: Record<string, string | number>,
) => {
  if (preset.tool === "ncict") {
    const [start, end] = protocolRanges[String(parameters.protocol)] ?? protocolRanges.chest;
    return {
      ...preset.request,
      age: Number(parameters.age),
      sex: String(parameters.sex),
      start,
      end,
      kvp: Number(parameters.kvp),
      ctdivol: Number(parameters.ctdivol),
    };
  }
  if (preset.tool === "ncinm") {
    return {
      ...preset.request,
      phantom_library: Number(parameters.phantomLibrary),
      sex: String(parameters.sex),
      age: Number(parameters.age),
      administered_activity_mbq: Number(parameters.administeredActivityMbq),
    };
  }
  return { ...preset.request, DAP: Number(parameters.dapGyCm2) };
};
