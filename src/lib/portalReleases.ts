type ReleaseFile = { key: string };

export const installerVersionLabel = (tool: string, files: ReleaseFile[]) => {
  const versions = new Map<string, string>();
  for (const file of files) {
    const match = file.key.match(/^(NCICT|NCIRF|NCINM)\/\1(\d+\.\d{8})_(mac\.dmg|windows\.exe)$/);
    if (!match || match[1] !== tool) continue;
    const platform = match[3] === "mac.dmg" ? "macOS" : "Windows";
    const previous = versions.get(platform);
    if (!previous || match[2].localeCompare(previous, undefined, { numeric: true }) > 0) {
      versions.set(platform, match[2]);
    }
  }
  if (!versions.size) return "No installers available";
  const unique = new Set(versions.values());
  if (unique.size === 1) return `Version ${[...unique][0]}`;
  return ["macOS", "Windows"].filter((platform) => versions.has(platform))
    .map((platform) => `${platform}: ${versions.get(platform)}`).join(" · ");
};

export const loadInstallerVersion = async (tool: string, signal: AbortSignal) => {
  const files: ReleaseFile[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ prefix: `${tool}/` });
    if (cursor) query.set("cursor", cursor);
    const response = await fetch(`/api/files?${query}`, { credentials: "include", signal });
    if (!response.ok) throw new Error("Release files could not be loaded.");
    const body = await response.json();
    files.push(...(body.objects || []));
    cursor = body.cursor || null;
  } while (cursor);
  return installerVersionLabel(tool, files);
};
