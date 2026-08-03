import ncictMarkdown from "@/content/manuals/NCICT-User-Manual.md?raw";
import ncinmMarkdown from "@/content/manuals/NCINM-User-Manual.md?raw";
import ncirfMarkdown from "@/content/manuals/NCIRF-User-Manual.md?raw";
import phantomMarkdown from "@/content/manuals/PHANTOM-User-Manual.md?raw";
import ncictApiMarkdown from "@/content/manuals/NCICTAPI-User-Manual.md?raw";
import ncinmApiMarkdown from "@/content/manuals/NCINMAPI-User-Manual.md?raw";
import ncirfApiMarkdown from "@/content/manuals/NCIRFAPI-User-Manual.md?raw";

export type ManualCategory = "software" | "api";

export type ManualDefinition = {
  id: string;
  title: string;
  product: string;
  category: ManualCategory;
  eyebrow: string;
  description: string;
  markdown: string;
};

export const manuals: ManualDefinition[] = [
  {
    id: "ncict",
    title: "NCICT 4 User Manual",
    product: "NCICT",
    category: "software",
    eyebrow: "Computed Tomography",
    description:
      "Installation, inputs, phantom selection, calculation workflow, batch processing, and result interpretation for NCICT 4.",
    markdown: ncictMarkdown,
  },
  {
    id: "ncinm",
    title: "NCINM 3 User Manual",
    product: "NCINM",
    category: "software",
    eyebrow: "Nuclear Medicine",
    description:
      "Reference documentation for radionuclide and radiopharmaceutical organ-dose calculations with NCINM 3.",
    markdown: ncinmMarkdown,
  },
  {
    id: "ncirf",
    title: "NCIRF 4 User Manual",
    product: "NCIRF",
    category: "software",
    eyebrow: "Radiography & Fluoroscopy",
    description:
      "Exposure geometry, phantom configuration, Monte Carlo calculation, batch processing, and output guidance for NCIRF 4.",
    markdown: ncirfMarkdown,
  },
  {
    id: "phantom",
    title: "PHANTOM User Manual",
    product: "PHANTOM",
    category: "software",
    eyebrow: "Computational Anatomy",
    description:
      "A guide to the NCI reference, size-dependent, pediatric, adult, and pregnant computational human phantom libraries.",
    markdown: phantomMarkdown,
  },
  {
    id: "ncict-api",
    title: "NCICT API Manual",
    product: "NCICT API",
    category: "api",
    eyebrow: "Vendor Integration",
    description:
      "REST request structure, authentication, parameters, examples, and response format for the NCICT API.",
    markdown: ncictApiMarkdown,
  },
  {
    id: "ncinm-api",
    title: "NCINM API Manual",
    product: "NCINM API",
    category: "api",
    eyebrow: "Vendor Integration",
    description:
      "REST documentation for radiopharmaceutical dose-calculation workflows using the NCINM API.",
    markdown: ncinmApiMarkdown,
  },
  {
    id: "ncirf-api",
    title: "NCIRF API Manual",
    product: "NCIRF API",
    category: "api",
    eyebrow: "Vendor Integration",
    description:
      "REST request, GEANT4 calculation, output, and integration documentation for the NCIRF API.",
    markdown: ncirfApiMarkdown,
  },
];

export const getManual = (id?: string) => manuals.find((manual) => manual.id === id);

export const getManualVersion = (markdown: string) =>
  markdown.match(/Current documented release:\s*\*\*([^*]+)\*\*/)?.[1] ?? null;

export const getManualBody = (markdown: string) =>
  markdown
    .replace(/^#\s+.+\n+/, "")
    .replace(/^_\*\*.+\*\*_\n+/m, "")
    .replace(/^Current documented release:\s*\*\*[^*]+\*\*\n+/m, "")
    .replace(/^---\n+/m, "")
    .trim();

const plainHeading = (value: string) =>
  value
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();

export const headingSlug = (value: string) =>
  plainHeading(value)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const getManualHeadings = (markdown: string) =>
  Array.from(markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)).map((match) => ({
    depth: match[1].length,
    label: plainHeading(match[2]),
    id: headingSlug(match[2]),
  }));
