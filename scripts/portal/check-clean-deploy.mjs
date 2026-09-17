import { spawnSync } from "node:child_process";

const gitCandidates = [
  process.env.NCIDOSE_GIT,
  "/Library/Developer/CommandLineTools/usr/bin/git",
  "git",
].filter(Boolean);

const runGit = (args) => {
  for (const command of gitCandidates) {
    const result = spawnSync(command, args, { cwd: process.cwd(), encoding: "utf8" });
    if (result.error?.code === "ENOENT") continue;
    if (result.status !== 0) {
      process.stderr.write(result.stderr || `Git exited with status ${result.status}.\n`);
      process.exit(result.status || 1);
    }
    return result.stdout.trim();
  }
  console.error("Git was not found. Set NCIDOSE_GIT to the Git executable path.");
  process.exit(1);
};

const changes = runGit(["status", "--porcelain", "--untracked-files=all"]);
if (changes) {
  console.error("Portal deployment stopped because the working tree is not clean:");
  console.error(changes);
  console.error("Commit the intended deployment or use a clean checkout before deploying.");
  process.exit(1);
}

const branch = runGit(["branch", "--show-current"]) || "detached HEAD";
const commit = runGit(["rev-parse", "--short=12", "HEAD"]);
console.log(`Portal deployment preflight passed: ${branch} ${commit}`);
