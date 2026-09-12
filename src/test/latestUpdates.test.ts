import { describe, expect, it } from "vitest";
import { getLatestUpdates } from "@/data/latestUpdates.js";
import { releaseHistories } from "@/data/releases";

const history = (id: string, markdown: string) => ({ id, product: id.toUpperCase(), markdown });

describe("homepage release highlights", () => {
  it("uses the newest dated entry, not a build date or stale metadata", () => {
    const updates = getLatestUpdates([
      history("a", "Latest release: **May 1, 2026**\n\n### September 9, 2026\n- Earlier.\n\n### October 1, 2026 — Scientific Update\n- Latest."),
      history("b", "### September 10, 2026\n- Another product."),
    ]);
    expect(updates.map((update) => update.id)).toEqual(["a", "b"]);
    expect(updates[0]).toMatchObject({ date: "October 1, 2026", isoDate: "2026-10-01", summary: "Latest.", href: "/versions/a" });
  });

  it("supports legacy headings, GUI/API subheadings, wrapped bullets, and CRLF", () => {
    const [update] = getLatestUpdates([history("ncirf", [
      "Latest update: **September 10, 2026**",
      "### September 10, 2026 — Scientific Update",
      "#### Scientific changes",
      "##### GUI",
      "- Added **SpekPy 2.5.4** with `0.5 keV` steps",
      "  and [custom spectra](https://example.org). A second sentence.",
      "- Another feature.",
      "##### API",
      "- API feature.",
    ].join("\r\n"))]);
    expect(update.summary).toBe("Added SpekPy 2.5.4 with 0.5 keV steps and custom spectra.");
  });

  it("bounds long highlights without cutting words", () => {
    const [update] = getLatestUpdates([history("a", `### September 1, 2026\n- ${"Detailed changes ".repeat(30)}.`)]);
    expect(update.summary.length).toBeLessThanOrEqual(200);
    expect(update.summary).toMatch(/(?:Detailed|changes)…$/);
  });

  it("does not fabricate dates or carry an older entry's summary forward", () => {
    const updates = getLatestUpdates([
      history("missing", "# History without dated entries"),
      history("invalid", "### February 30, 2026\n- Invalid."),
      history("valid", "### March 1, 2026\n\n### February 1, 2026\n- Older summary."),
    ]);
    expect(updates).toHaveLength(1);
    expect(updates[0].summary).toBe("Read the latest changes in the version history.");
  });

  it("breaks date ties consistently without changing source order", () => {
    const histories = [history("b", "### May 1, 2026\n- B."), history("a", "### May 1, 2026\n- A.")];
    expect(getLatestUpdates(histories).map((update) => update.id)).toEqual(["a", "b"]);
    expect(histories.map((entry) => entry.id)).toEqual(["b", "a"]);
  });

  it("automatically picks up a new history entry without homepage edits", () => {
    const original = history("a", "### May 1, 2026\n- Old feature.");
    const edited = { ...original, markdown: `### June 2, 2026\n- New feature.\n\n${original.markdown}` };
    expect(getLatestUpdates([original])[0].date).toBe("May 1, 2026");
    expect(getLatestUpdates([edited])[0]).toMatchObject({ date: "June 2, 2026", summary: "New feature." });
  });

  it("provides a current, nonempty highlight for each real product history", () => {
    const updates = getLatestUpdates(releaseHistories);
    expect(updates).toHaveLength(releaseHistories.length);
    for (const update of updates) {
      expect(update.isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(update.summary.length).toBeGreaterThan(10);
      expect(update.summary).not.toBe("Read the latest changes in the version history.");
      expect(update.href).toBe(`/versions/${update.id}`);
    }
  });
});
