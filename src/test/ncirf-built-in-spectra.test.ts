import { describe, expect, it } from "vitest";
import {
  isNcirfBuiltInSpectrum,
  ncirfBuiltInKvps,
  ncirfBuiltInSpectrumForValues,
  ncirfBuiltInSpectra,
  ncirfBuiltInSpectraForKvp,
} from "@/data/ncirfBuiltInSpectra.js";

describe("NCIRF built-in spectrum allowlist", () => {
  it("contains the complete immutable public catalog", () => {
    expect(ncirfBuiltInSpectra).toHaveLength(114);
    expect(new Set(ncirfBuiltInSpectra.map((spectrum) => spectrum.id)).size).toBe(114);
    expect(ncirfBuiltInKvps).toEqual([28, 30, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125]);
  });

  it("allows only catalogued kVp/HVL pairs", () => {
    expect(isNcirfBuiltInSpectrum(80, 4.56)).toBe(true);
    expect(isNcirfBuiltInSpectrum(60, 4.65)).toBe(true);
    expect(isNcirfBuiltInSpectrum(60, 4.56)).toBe(false);
    expect(isNcirfBuiltInSpectrum(102, 4.5)).toBe(false);
    expect(ncirfBuiltInSpectrumForValues(80, 4.56)?.id).toBe("builtin_036");
    expect(ncirfBuiltInSpectraForKvp(60)).toHaveLength(8);
  });
});
