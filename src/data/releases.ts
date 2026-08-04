import ncictMarkdown from "@/content/releases/NCICT-Version-History.md?raw";
import ncirfMarkdown from "@/content/releases/NCIRF-Version-History.md?raw";
import ncinmMarkdown from "@/content/releases/NCINM-Version-History.md?raw";
import phantomMarkdown from "@/content/releases/PHANTOM-Version-History.md?raw";

export type ReleaseHistoryDefinition = {
  id: string;
  product: string;
  title: string;
  modality: string;
  description: string;
  latestUpdate: string;
  latestOfficialRelease: string;
  firstReleaseYear: string;
  markdown: string;
};

const metadataValue = (markdown: string, label: string) => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.match(new RegExp(`^${escapedLabel}: \\*\\*([^*]+)\\*\\*$`, "m"))?.[1] ?? "";
};

export const releaseHistories: ReleaseHistoryDefinition[] = [
  {
    id: "ncict",
    product: "NCICT",
    title: "NCICT Release History",
    modality: "Computed Tomography",
    description:
      "A chronological record of official releases, calculation-library updates, interface improvements, and maintenance changes for NCICT.",
    latestUpdate: metadataValue(ncictMarkdown, "Latest update"),
    latestOfficialRelease: metadataValue(ncictMarkdown, "Latest official release"),
    firstReleaseYear: metadataValue(ncictMarkdown, "Record begins"),
    markdown: ncictMarkdown,
  },
  {
    id: "ncirf",
    product: "NCIRF",
    title: "NCIRF Release History",
    modality: "Radiography & Fluoroscopy",
    description:
      "A chronological record of Monte Carlo calculation, phantom-library, Batch Manager, API, and interface updates for NCIRF.",
    latestUpdate: metadataValue(ncirfMarkdown, "Latest update"),
    latestOfficialRelease: metadataValue(ncirfMarkdown, "Latest official release"),
    firstReleaseYear: metadataValue(ncirfMarkdown, "Record begins"),
    markdown: ncirfMarkdown,
  },
  {
    id: "ncinm",
    product: "NCINM",
    title: "NCINM Release History",
    modality: "Nuclear Medicine",
    description:
      "A chronological record of radionuclide libraries, biokinetic models, phantom support, Batch Manager, API, and interface updates for NCINM.",
    latestUpdate: metadataValue(ncinmMarkdown, "Latest update"),
    latestOfficialRelease: metadataValue(ncinmMarkdown, "Latest official release"),
    firstReleaseYear: metadataValue(ncinmMarkdown, "Record begins"),
    markdown: ncinmMarkdown,
  },
  {
    id: "phantom",
    product: "PHANTOM",
    title: "PHANTOM Library History",
    modality: "Computational Phantoms",
    description:
      "A chronological record of anatomical refinements, library expansions, file-format releases, and data corrections across the NCI phantom collections.",
    latestUpdate: metadataValue(phantomMarkdown, "Latest update"),
    latestOfficialRelease: metadataValue(phantomMarkdown, "Latest official release"),
    firstReleaseYear: metadataValue(phantomMarkdown, "Record begins"),
    markdown: phantomMarkdown,
  },
];

export const getReleaseHistory = (id?: string) =>
  releaseHistories.find((history) => history.id === id);

export const getReleaseHistoryBody = (markdown: string) =>
  markdown
    .replace(/^#\s+.+\n+/, "")
    .replace(/^_.*_\n+/, "")
    .replace(/^(?:Latest update|Latest official release|Record begins): .*\n?/gm, "")
    .trim();
