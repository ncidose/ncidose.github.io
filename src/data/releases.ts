import ncictMarkdown from "../../_versions/NCICT-Version-History.md?raw";
import ncirfMarkdown from "../../_versions/NCIRF-Version-History.md?raw";
import ncinmMarkdown from "../../_versions/NCINM-Version-History.md?raw";
import phantomMarkdown from "../../_versions/PHANTOM-Version-History.md?raw";

export type ReleaseHistoryDefinition = {
  id: string;
  product: string;
  title: string;
  modality: string;
  description: string;
  latestRelease: string;
  latestScientificUpdate: string;
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
      "A chronological record of scientific and maintenance updates for NCICT.",
    latestRelease: metadataValue(ncictMarkdown, "Latest release"),
    latestScientificUpdate: metadataValue(ncictMarkdown, "Latest scientific update"),
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
    latestRelease: metadataValue(ncirfMarkdown, "Latest release"),
    latestScientificUpdate: metadataValue(ncirfMarkdown, "Latest scientific update"),
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
    latestRelease: metadataValue(ncinmMarkdown, "Latest release"),
    latestScientificUpdate: metadataValue(ncinmMarkdown, "Latest scientific update"),
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
    latestRelease: metadataValue(phantomMarkdown, "Latest release"),
    latestScientificUpdate: metadataValue(phantomMarkdown, "Latest scientific update"),
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
    .replace(/^(?:Latest release|Latest scientific update|Record begins): .*\n?/gm, "")
    .trim();
