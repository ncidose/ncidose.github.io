import ncictMarkdown from "@/content/releases/NCICT-Version-History.md?raw";

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
];

export const getReleaseHistory = (id?: string) =>
  releaseHistories.find((history) => history.id === id);

export const getReleaseHistoryBody = (markdown: string) =>
  markdown
    .replace(/^#\s+.+\n+/, "")
    .replace(/^_.*_\n+/, "")
    .replace(/^(?:Latest update|Latest official release|Record begins): .*\n?/gm, "")
    .trim();
