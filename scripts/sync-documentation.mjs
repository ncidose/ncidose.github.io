import { access, cp, lstat, mkdir, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const documentationRoot =
  process.env.NCIDOSE_DOCUMENTATION_ROOT ||
  path.join(os.homedir(), "ncidose_frontend");

const collections = [
  {
    name: "manuals",
    source: path.join(documentationRoot, "_manuals"),
    destination: path.join(repositoryRoot, "src", "content", "manuals"),
  },
  {
    name: "release histories",
    source: path.join(documentationRoot, "_versions"),
    destination: path.join(repositoryRoot, "src", "content", "releases"),
  },
];

for (const collection of collections) {
  try {
    await access(collection.source);
    const sourceStats = await lstat(collection.source);

    if (!sourceStats.isDirectory()) {
      console.warn(
        `[docs:sync] Skipped ${collection.name}: ${collection.source} is not a directory.`,
      );
      continue;
    }

    await mkdir(collection.destination, { recursive: true });

    const sourcePath = await realpath(collection.source);
    const destinationPath = await realpath(collection.destination);
    if (sourcePath === destinationPath) {
      console.warn(
        `[docs:sync] Skipped ${collection.name}: source still points to the website copy.`,
      );
      continue;
    }

    await cp(collection.source, collection.destination, {
      recursive: true,
      force: true,
      preserveTimestamps: true,
    });
    console.log(`[docs:sync] Updated ${collection.name} from ${collection.source}.`);
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.log(
        `[docs:sync] ${collection.name} source is not present; using the repository copy.`,
      );
      continue;
    }
    throw error;
  }
}
