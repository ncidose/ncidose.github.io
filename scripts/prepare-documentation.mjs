import { cp, lstat, mkdir, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Markdown is imported directly from these in-repository authoring folders.
// Never copy Markdown from a sibling folder, the home directory, or an env override.
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const folder of ["_manuals", "_versions", "_manuals/images"]) {
  const directory = path.join(repositoryRoot, folder);
  if (!(await lstat(directory)).isDirectory()) {
    throw new Error(`Missing documentation source directory: ${folder}`);
  }
}

// This destination is generated/ignored, just like dist. Images remain beside
// the Markdown for editor previews, while public image URLs remain unchanged.
const source = path.join(repositoryRoot, "_manuals/images");
const destination = path.join(repositoryRoot, "public/manuals/images");
await mkdir(destination, { recursive: true });
if ((await lstat(destination)).isSymbolicLink() || (await realpath(source)) === (await realpath(destination))) {
  throw new Error("Generated manual image directory must be separate from the authoring sources");
}
// Refuse links in this small asset tree: no reads outside the repository or
// writes through links in generated output. Existing extra files are not deleted.
async function rejectLinks(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.isSymbolicLink()) throw new Error(`Unexpected image symlink: ${path.join(directory, item.name)}`);
    if (item.isDirectory()) await rejectLinks(path.join(directory, item.name));
  }
}
await rejectLinks(source);
await rejectLinks(destination);
await cp(source, destination, {
  recursive: true,
  force: true,
  preserveTimestamps: true,
  filter: (entry) => path.basename(entry) !== ".DS_Store",
});
console.log("[docs:prepare] Markdown uses _manuals/ and _versions/ directly; prepared public manual images.");
