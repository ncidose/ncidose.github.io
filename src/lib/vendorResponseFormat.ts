// Only dose/error values are rounded for the readable preview. Never apply this
// formatter to requests, persisted responses, metadata, or the upstream API.
const ctDoseKeys = new Set([
  "brain", "pituitary gland", "lens", "eye balls", "salivary glands", "oral cavity",
  "spinal cord", "thyroid", "esophagus", "trachea", "thymus", "lungs", "breast",
  "heart wall", "heart la", "heart ra", "heart lv", "heart rv", "heart lvm",
  "heart lmca", "heart lada", "heart lca", "heart rca", "heart av", "heart mv",
  "heart pv", "heart tv", "stomach wall", "liver", "gall bladder", "adrenals",
  "spleen", "pancreas", "kidney", "small intestine", "colon", "rectosigmoid",
  "urinary bladder", "prostate", "uterus", "testes", "ovaries", "skin", "muscle",
  "blood vessel", "active marrow", "shallow marrow", "effective dose msv",
]);

function decimalNotation(text: string): string {
  if (!/e/i.test(text)) return text;
  const [coefficient, exponent] = text.toLowerCase().split("e");
  const sign = coefficient.startsWith("-") ? "-" : "";
  const unsigned = coefficient.replace(/^-/, "");
  const digits = unsigned.replace(".", "");
  const point = (unsigned.includes(".") ? unsigned.indexOf(".") : unsigned.length) + Number(exponent);
  if (point <= 0) return `${sign}0.${"0".repeat(-point)}${digits}`;
  if (point >= digits.length) return `${sign}${digits}${"0".repeat(point - digits.length)}`;
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

export function formatDoseNumber(value: number): string {
  if (!Number.isFinite(value)) return "null";
  if (value === 0) return "0.00";
  return decimalNotation(Math.abs(value) < 0.01 ? value.toPrecision(3) : value.toFixed(2));
}

function isDosePath(tool: string, path: string[]): boolean {
  if (tool === "ncict") return path.length === 1 && ctDoseKeys.has(path[0]);
  if (tool === "ncinm") return path.length === 2 && path[0] === "dose_mGy";
  return tool === "ncirf" && path.length === 2 && ["dose", "error_percent"].includes(path[0]);
}

export function formatVendorResponse(value: unknown, tool: string): string | undefined {
  // Normalize to JSON once so nulls, arrays, omitted fields, and escaped strings
  // keep JSON semantics. The original response object is never changed.
  const raw = JSON.stringify(value);
  if (raw === undefined) return undefined;
  const render = (item: unknown, path: string[], depth: number): string => {
    if (typeof item === "number" && isDosePath(tool, path)) return formatDoseNumber(item);
    if (item === null || typeof item !== "object") return JSON.stringify(item);
    const indent = "  ".repeat(depth);
    const childIndent = `${indent}  `;
    if (Array.isArray(item)) {
      if (item.length === 0) return "[]";
      return `[\n${item.map((child, i) => childIndent + render(child, [...path, String(i)], depth + 1)).join(",\n")}\n${indent}]`;
    }
    const entries = Object.entries(item);
    if (entries.length === 0) return "{}";
    return `{\n${entries.map(([key, child]) => `${childIndent}${JSON.stringify(key)}: ${render(child, [...path, key], depth + 1)}`).join(",\n")}\n${indent}}`;
  };
  return render(JSON.parse(raw), [], 0);
}
