import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, open, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const profile = process.env.NCIDOSE_R2_SYNC_PROFILE === "phantom" ? "phantom" : "releases";
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDirectory, "../../..");
const defaultSource = profile === "phantom"
  ? path.join(frontendRoot, "_release/PHANTOM")
  : path.join(frontendRoot, "_release");
const source = path.resolve(process.argv[2] || process.env.NCIDOSE_RELEASE_DIR || defaultSource);
const keyPrefix = profile === "phantom" ? "PHANTOM" : "";
const bundlesOnly = process.env.NCIDOSE_R2_BUNDLES_ONLY === "true";
const mirror = process.env.NCIDOSE_R2_MIRROR === "true";
if (mirror && profile !== "phantom") throw new Error("mirror mode is restricted to the PHANTOM profile");
if (mirror && bundlesOnly) throw new Error("mirror mode cannot be combined with bundles-only mode");
const workerUrl = (process.env.NCIDOSE_R2_WORKER_URL || "https://ncidosetools-storage-admin.ncidosetools-614ade55.workers.dev").replace(/\/$/, "");
const token = process.env.NCIDOSE_R2_UPLOAD_TOKEN || (() => {
  try {
    return execFileSync(
      "security",
      ["find-generic-password", "-a", os.userInfo().username, "-s", "ncidosetools-r2-uploader", "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    throw new Error(
      "R2 upload token not found in this Mac's Keychain. See scripts/r2/README.md.",
    );
  }
})();
const partSize = 32 * 1024 * 1024;
const fileConcurrency = 4;
const excludedNames = new Set([".DS_Store", "_archive", "upload_to_r2.py"]);
const legacyBundleKeys = new Set([
  "PHANTOM/nci_size/arm_highres.zip",
  "PHANTOM/nci_size/arm_lowres.zip",
  "PHANTOM/nci_size/armless_highres.zip",
  "PHANTOM/nci_size/armless_lowres.zip",
]);

const mimeTypes = new Map([
  [".csv", "text/csv; charset=utf-8"],
  [".dmg", "application/x-apple-diskimage"],
  [".exe", "application/vnd.microsoft.portable-executable"],
  [".gdoc", "application/json; charset=utf-8"],
  [".gz", "application/gzip"],
  [".md", "text/markdown; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  [".zip", "application/zip"],
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestJson(pathname, options = {}, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${workerUrl}${pathname}`, {
        ...options,
        headers: { authorization: `Bearer ${token}`, ...(options.headers || {}) },
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      if (response.ok) return body;
      const error = new Error(`HTTP ${response.status}: ${body.error || text}`);
      if (![408, 429, 500, 502, 503, 504].includes(response.status)) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleep(Math.min(1000 * 2 ** (attempt - 1), 15000));
  }
  throw lastError;
}

async function collect(directory, prefix = "") {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (excludedNames.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await collect(absolute, relative)));
    else if (entry.isFile()) files.push({ absolute, key: relative, size: (await stat(absolute)).size });
  }
  return files;
}

async function collectDirectories(directory, prefix) {
  const directories = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || excludedNames.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const key = `${prefix}/${entry.name}`;
    directories.push({ absolute, key });
    directories.push(...(await collectDirectories(absolute, key)));
  }
  return directories;
}

async function sha256File(file) {
  return await new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file).on("data", (chunk) => hash.update(chunk)).on("error", reject).on("end", () => resolve(hash.digest("hex")));
  });
}

async function uploadFile(file, index, total) {
  const sha256 = await sha256File(file.absolute);
  const query = new URLSearchParams({ key: file.key });
  const existing = await requestJson(`/head?${query}`);
  if (existing.exists && existing.size === file.size && existing.customMetadata?.sha256 === sha256) {
    console.log(`[${index}/${total}] skipped ${file.key} (${file.size} bytes)`);
    return "skipped";
  }

  const extension = file.key.endsWith(".nii.gz") ? ".gz" : path.extname(file.key).toLowerCase();
  const created = await requestJson("/multipart/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: file.key, contentType: mimeTypes.get(extension) || "application/octet-stream", sha256 }),
  });

  const parts = [];
  const handle = await open(file.absolute, "r");
  try {
    const partCount = Math.max(1, Math.ceil(file.size / partSize));
    for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
      const start = (partNumber - 1) * partSize;
      const length = Math.min(partSize, Math.max(0, file.size - start));
      const buffer = Buffer.alloc(length);
      if (length) await handle.read(buffer, 0, length, start);
      const partQuery = new URLSearchParams({ key: file.key, uploadId: created.uploadId, partNumber: String(partNumber) });
      const uploadedPart = await requestJson(`/multipart/part?${partQuery}`, {
        method: "PUT",
        headers: { "content-type": "application/octet-stream", "content-length": String(length) },
        body: buffer,
      });
      parts.push(uploadedPart);
    }
    await requestJson("/multipart/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: file.key, uploadId: created.uploadId, parts }),
    });
  } catch (error) {
    await requestJson("/multipart/abort", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: file.key, uploadId: created.uploadId }),
    }).catch(() => {});
    throw error;
  } finally {
    await handle.close();
  }

  const verified = await requestJson(`/head?${query}`);
  if (!verified.exists || verified.size !== file.size || verified.customMetadata?.sha256 !== sha256) {
    throw new Error(`verification failed for ${file.key}`);
  }
  console.log(`[${index}/${total}] uploaded ${file.key} (${file.size} bytes)`);
  return "uploaded";
}

async function listRemote(prefix = "") {
  const objects = [];
  let cursor = "";
  do {
    const query = new URLSearchParams();
    if (cursor) query.set("cursor", cursor);
    if (prefix) query.set("prefix", `${prefix}/`);
    const page = await requestJson(`/list?${query}`);
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : "";
  } while (cursor);
  return objects;
}

async function deleteRemote(keys) {
  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000);
    await requestJson("/objects", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keys: batch }),
    });
    console.log(`Deleted ${Math.min(index + batch.length, keys.length)}/${keys.length} stale objects`);
  }
}

const bundleTempDirectory = await mkdtemp(path.join(os.tmpdir(), "ncidose-r2-bundles-"));
try {
const bundleFiles = [];
const bundleRoots = profile === "phantom"
  ? [{ absolute: source, key: "PHANTOM" }]
  : ["PHANTOM", "DCC"].map((key) => ({ absolute: path.join(source, key), key }));
const bundleDirectories = [];
for (const root of bundleRoots) {
  if ((await stat(root.absolute).catch(() => null))?.isDirectory()) {
    bundleDirectories.push(...(await collectDirectories(root.absolute, root.key)));
  }
}
for (const [index, directory] of bundleDirectories.entries()) {
  const archive = path.join(bundleTempDirectory, `${String(index + 1).padStart(4, "0")}.zip`);
  const archiveKey = `_folder-downloads/${directory.key}.zip`;
  const parentKey = directory.key.split("/").slice(0, -1).join("/");
  const exclusions = [...legacyBundleKeys]
    .filter((key) => key.startsWith(`${directory.key}/`))
    .map((key) => key.slice(parentKey.length + 1));
  console.log(`Building folder download ${directory.key}`);
  execFileSync("zip", ["-0", "-q", "-r", archive, path.basename(directory.absolute), "-x", "*/.DS_Store", ...exclusions], {
    cwd: path.dirname(directory.absolute),
  });
  bundleFiles.push({ absolute: archive, key: archiveKey, size: (await stat(archive)).size });
}

const collectedFiles = (await collect(source, keyPrefix)).filter((file) => !legacyBundleKeys.has(file.key));
const files = bundlesOnly ? bundleFiles : [...collectedFiles, ...bundleFiles];
const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
console.log(`Syncing ${files.length} files (${totalBytes} bytes) from ${source}`);

let next = 0;
let uploaded = 0;
let skipped = 0;
const errors = [];
async function runUploadWorker() {
  while (true) {
    const current = next;
    next += 1;
    if (current >= files.length) return;
    try {
      const result = await uploadFile(files[current], current + 1, files.length);
      if (result === "uploaded") uploaded += 1;
      else skipped += 1;
    } catch (error) {
      errors.push({ key: files[current].key, error: String(error) });
      console.error(`[${current + 1}/${files.length}] FAILED ${files[current].key}: ${error}`);
    }
  }
}
await Promise.all(Array.from({ length: fileConcurrency }, () => runUploadWorker()));

const remote = profile === "phantom"
  ? [...(await listRemote("PHANTOM")), ...(await listRemote("_folder-downloads/PHANTOM"))]
  : await listRemote();
const remoteMap = new Map(remote.map((object) => [object.key, object.size]));
const missing = files.filter((file) => remoteMap.get(file.key) !== file.size);
const matchedBytes = files.reduce((sum, file) => sum + (remoteMap.get(file.key) === file.size ? file.size : 0), 0);
console.log(`SUMMARY uploaded=${uploaded} skipped=${skipped} failed=${errors.length}`);
console.log(`VERIFY local_files=${files.length} matched_files=${files.length - missing.length} local_bytes=${totalBytes} matched_bytes=${matchedBytes} remote_objects=${remote.length}`);
if (errors.length || missing.length) {
  process.exitCode = 1;
} else if (mirror) {
  const localKeys = new Set(files.map((file) => file.key));
  const staleKeys = remote.filter((object) => !localKeys.has(object.key)).map((object) => object.key);
  console.log(`MIRROR stale_objects=${staleKeys.length}`);
  if (staleKeys.length) await deleteRemote(staleKeys);

  const mirrored = [...(await listRemote("PHANTOM")), ...(await listRemote("_folder-downloads/PHANTOM"))];
  const mirroredMap = new Map(mirrored.map((object) => [object.key, object.size]));
  const mismatched = files.filter((file) => mirroredMap.get(file.key) !== file.size);
  const unexpected = mirrored.filter((object) => !localKeys.has(object.key));
  console.log(`MIRROR_VERIFY local_objects=${files.length} remote_objects=${mirrored.length} mismatched=${mismatched.length} unexpected=${unexpected.length}`);
  if (mismatched.length || unexpected.length || mirrored.length !== files.length) process.exitCode = 1;
}
} finally {
  await rm(bundleTempDirectory, { recursive: true, force: true });
}
