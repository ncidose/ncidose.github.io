export type VendorApiDemoTool = "ncict" | "ncinm" | "ncirf";

export type VendorApiDemoPreset = {
  id: string;
  tool: VendorApiDemoTool;
  name: string;
  modality: string;
  endpoint: string;
  request: Record<string, unknown>;
  defaultParameters: Record<string, string | number>;
  expectedTime?: string;
};

export const vendorApiDemoPresets: VendorApiDemoPreset[] = [
  {
    id: "ncict-adult-chest",
    tool: "ncict",
    name: "CT dosimetry",
    modality: "NCICT",
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
      bodySizeMethod: "age-sex",
      heightCm: 165,
      weightKg: 65,
      wedCm: 25,
      kvp: 120,
      tcmStrength: 0,
      headBody: 2,
      ctdivol: 10,
    },
  },
  {
    id: "ncirf-size-demo",
    tool: "ncirf",
    name: "Radiography & fluoroscopy dosimetry",
    modality: "NCIRF",
    endpoint: "https://ncirf-api.ncidosetools.com/param",
    request: {
      ID: "public-vendor-demo",
      PhtLib: 4,
      Age: 30,
      Sex: "f",
      HT: 160,
      WT: 50,
      kVp: 80,
      HVL: 4.56,
      SID: 80,
      FW: 15,
      FH: 15,
      DAP: 100,
      PPA: 180,
      PSA: 0,
      ISOX: 17.8,
      ISOY: 13.6,
      ISOZ: 119.9,
      Tbl: 1,
      Hist: 10000,
      Thread: 2,
    },
    defaultParameters: {
      phantomLibrary: 4,
      age: 30,
      pregnantAge: "20wk",
      sex: "f",
      heightCm: 160,
      weightKg: 50,
      kvp: 80,
      hvlMmAl: 4.56,
      sidCm: 80,
      fieldWidthCm: 15,
      fieldHeightCm: 15,
      dapGyCm2: 100,
      ppaDeg: 180,
      psaDeg: 0,
      isoXCm: 17.8,
      isoYCm: 13.6,
      isoZCm: 119.9,
      tableCm: 1,
    },
    expectedTime: "Fast demo: 10,000 histories, 2 threads, usually under 30 seconds. Larger tests require a dedicated deployment.",
  },  {
    id: "ncinm-fdg-adult",
    tool: "ncinm",
    name: "Nuclear medicine dosimetry",
    modality: "NCINM",
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
      radiopharmaceutical: "F-18 FDG",
      administeredActivityMbq: 200,
    },
  },

];

export const vendorApiDemoPresetForTool = (tool?: string | null) =>
  vendorApiDemoPresets.find((preset) => preset.tool === tool) ?? vendorApiDemoPresets[0];

const protocolRanges: Record<string, [number, number]> = {
  head: [1001, 1003],
  neck: [1002, 1005],
  chest: [1004, 1007],
  abdomen: [1006, 1008],
  pelvis: [1008, 1009],
  abdomenPelvis: [1006, 1009],
  cap: [1004, 1009],
  wholeBody: [1001, 1010],
};

export const buildVendorApiDemoRequest = (
  preset: VendorApiDemoPreset,
  parameters: Record<string, string | number>,
) => {
  if (preset.tool === "ncict") {
    const [start, end] = protocolRanges[String(parameters.protocol)] ?? protocolRanges.chest;
    const request: Record<string, unknown> = {
      ...preset.request,
      age: Number(parameters.age),
      sex: String(parameters.sex),
      start,
      end,
      kvp: Number(parameters.kvp),
      tcm_strength: Number(parameters.tcmStrength),
      head_body: Number(parameters.headBody),
      ctdivol: Number(parameters.ctdivol),
    };
    if (parameters.bodySizeMethod === "wed") request.wed = Number(parameters.wedCm);
    if (parameters.bodySizeMethod === "height-weight") {
      request.height = Number(parameters.heightCm);
      request.weight = Number(parameters.weightKg);
    }
    return request;
  }
  if (preset.tool === "ncinm") {
    return {
      ...preset.request,
      phantom_library: Number(parameters.phantomLibrary),
      sex: String(parameters.sex),
      age: Number(parameters.age),
      radiopharmaceutical: String(parameters.radiopharmaceutical),
      administered_activity_mbq: Number(parameters.administeredActivityMbq),
    };
  }
  const phantomLibrary = Number(parameters.phantomLibrary);
  return {
    ...preset.request,
    PhtLib: phantomLibrary,
    Age: phantomLibrary === 5 ? String(parameters.pregnantAge) : Number(parameters.age),
    Sex: String(parameters.sex),
    HT: Number(parameters.heightCm),
    WT: Number(parameters.weightKg),
    kVp: Number(parameters.kvp),
    HVL: Number(parameters.hvlMmAl),
    SID: Number(parameters.sidCm),
    FW: Number(parameters.fieldWidthCm),
    FH: Number(parameters.fieldHeightCm),
    DAP: Number(parameters.dapGyCm2),
    PPA: Number(parameters.ppaDeg),
    PSA: Number(parameters.psaDeg),
    ISOX: Number(parameters.isoXCm),
    ISOY: Number(parameters.isoYCm),
    ISOZ: Number(parameters.isoZCm),
    Tbl: Number(parameters.tableCm),
  };
};
