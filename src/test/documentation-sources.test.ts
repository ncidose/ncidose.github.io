import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { manuals } from "@/data/manuals";
import { releaseHistories } from "@/data/releases";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("single documentation authoring source", () => {
  it.each([
    ["ncict", "NCICT-User-Manual.md"],
    ["ncinm", "NCINM-User-Manual.md"],
    ["ncirf", "NCIRF-User-Manual.md"],
    ["phantom", "PHANTOM-User-Manual.md"],
    ["ncict-api", "NCICTAPI-User-Manual.md"],
    ["ncinm-api", "NCINMAPI-User-Manual.md"],
    ["ncirf-api", "NCIRFAPI-User-Manual.md"],
  ])("renders the editable %s manual directly", (id, file) => {
    expect(manuals.find((entry) => entry.id === id)?.markdown).toBe(read(`_manuals/${file}`));
  });

  it.each(["ncict", "ncinm", "ncirf", "phantom"])("renders the editable %s history directly", (id) => {
    expect(releaseHistories.find((entry) => entry.id === id)?.markdown)
      .toBe(read(`_versions/${id.toUpperCase()}-Version-History.md`));
  });

  it("uses canonical sources for SEO and has no old Markdown-copy directories", () => {
    const seo = read("scripts/generate-seo-pages.mjs");
    expect(seo).toContain('path.join(projectRoot, "_manuals", source)');
    expect(seo).toContain('path.join(projectRoot, "_versions", source)');
    expect(existsSync(path.join(root, "src/content/manuals"))).toBe(false);
    expect(existsSync(path.join(root, "src/content/releases"))).toBe(false);
    const prepare = read("scripts/prepare-documentation.mjs");
    expect(prepare).not.toContain("NCIDOSE_DOCUMENTATION_ROOT");
    expect(prepare).not.toContain("homedir()");
  });

  it("keeps every manual image available beside the editable Markdown", () => {
    for (const manual of manuals) {
      for (const match of manual.markdown.matchAll(/!\[[^\]]*\]\((images\/[^)]+)\)/g)) {
        expect(existsSync(path.join(root, "_manuals", match[1])), match[1]).toBe(true);
      }
    }
  });
});
