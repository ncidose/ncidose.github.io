import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const html = readFileSync("scripts/legacy-site/redirect.html", "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];

describe("legacy project website redirect", () => {
  it.each([
    ["/ncidosetools/", "https://ncidose.github.io/"],
    ["/ncidosetools/vendors?tool=ncirf#api-sandbox", "https://ncidose.github.io/vendors?tool=ncirf#api-sandbox"],
    ["/ncidosetools/#/tools#ncinm", "https://ncidose.github.io/tools/ncinm"],
    ["/ncidosetools/tools#phantom", "https://ncidose.github.io/tools/phantom"],
    ["/ncidosetools/#/documentation", "https://ncidose.github.io/manuals"],
    ["/ncidosetools/questions/github-32", "https://ncidose.github.io/discussions/github-32"],
    ["/ncidosetools/#how-to-access", "https://ncidose.github.io/researchers"],
  ])("preserves the destination of %s", (path, expected) => {
    const url = new URL(path, "https://ncidose.github.io");
    let destination = "";
    runInNewContext(script, { URL, location: { pathname: url.pathname, search: url.search, hash: url.hash, replace: (value: string) => { destination = value; } } });
    expect(destination).toBe(expected);
  });
});
