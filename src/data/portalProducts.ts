export const portalProducts = [
  { tool: "NCICT", name: "Computed Tomography", desktop: true },
  { tool: "NCIRF", name: "Radiography & Fluoroscopy", desktop: true },
  { tool: "NCINM", name: "Nuclear Medicine", desktop: true },
  { tool: "PHANTOM", name: "Computational Phantom Library", desktop: false },
  { tool: "DCC", name: "Dose conversion coefficients", desktop: false },
] as const;

export const selectedDownloadTool = (tool?: string | null) =>
  portalProducts.find((product) => product.tool === tool?.toUpperCase())?.tool ?? "NCICT";

export const portalDownloadPath = (tool: string) =>
  `/portal/downloads?tool=${encodeURIComponent(selectedDownloadTool(tool))}`;
