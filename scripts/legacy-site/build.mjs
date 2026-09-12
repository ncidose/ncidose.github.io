import { mkdir, readFile, writeFile } from "node:fs/promises";

const html = await readFile(new URL("./redirect.html", import.meta.url), "utf8");
const paths = ["", "tools", "vendors", "researchers", "resources", "literature", "manuals", "documentation", "questions", "discussions", "portal", "portal/request-access"];
for (const tool of ["ncict", "ncirf", "ncinm", "phantom"]) {
  for (const area of ["tools", "manuals", "versions", "literature"]) paths.push(`${area}/${tool}`);
}
for (const path of paths) {
  await mkdir(`redirect-dist/${path}`, { recursive: true });
  await writeFile(`redirect-dist/${path}/index.html`, html);
}
await writeFile("redirect-dist/404.html", html);
await writeFile("redirect-dist/.nojekyll", "");
