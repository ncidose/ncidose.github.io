import { describe, expect, it } from "vitest";
import { formatDoseNumber, formatVendorResponse } from "@/lib/vendorResponseFormat";

describe("sandbox dose display", () => {
  it.each([
    [1301.604251, "1301.60"], [1.436962, "1.44"], [1, "1.00"],
    [0, "0.00"], [-0, "0.00"], [0.01, "0.01"], [0.009999, "0.0100"],
    [0.0047328, "0.00473"], [0.000000047328, "0.0000000473"],
    [-0.0047328, "-0.00473"], [-12.3456, "-12.35"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatDoseNumber(value)).toBe(expected);
    expect(typeof JSON.parse(formatDoseNumber(value))).toBe("number");
  });

  it("does not turn even extreme small finite values into zero", () => {
    for (const value of [Number.MIN_VALUE, 1e-100, -1e-100, 1e21, Number.MAX_VALUE]) {
      const text = formatDoseNumber(value);
      expect(text).not.toMatch(/e/i);
      expect(Number(text)).not.toBe(0);
      expect(Number.isFinite(Number(text))).toBe(true);
    }
  });

  it("formats only the CT dose allowlist, never patient metadata or future fields", () => {
    const response = { brain: 0.0047328, "effective dose msv": 1.23456,
      wed_cm: 23.123456789, matched_phantom_id: 3160055, future_numeric_field: 0.000123456,
      nested: { brain: 1.23456 }, legacy_string: "0.08", missing: null };
    const raw = JSON.stringify(response);
    const text = formatVendorResponse(response, "ncict")!;
    expect(text).toContain('"brain": 0.00473');
    expect(text).toContain('"effective dose msv": 1.23');
    expect(JSON.parse(text)).toEqual({ ...response, brain: 0.00473, "effective dose msv": 1.23 });
    expect(JSON.stringify(response)).toBe(raw);
  });

  it("formats NM dose values without rounding activity or matching scores", () => {
    const response = { dose_mGy: { liver: 12.34567, effective_dose_mSv: 0.00047328 },
      input: { administered_activity_mbq: 1.234567 }, radiopharmaceutical_match: { score: 0.91234567 } };
    expect(JSON.parse(formatVendorResponse(response, "ncinm")!)).toEqual({ ...response,
      dose_mGy: { liver: 12.35, effective_dose_mSv: 0.000473 } });
  });

  it("formats RF dose and error percentages but preserves all spectrum metadata", () => {
    const response = { dose: { skin: 1301.604251, colon: 0 }, error_percent: { skin: 1.23456 },
      matched: { spectrum_hvl_mm_al: 5.383123456, spectrum: { id: "001", dap_kernel: 0.000123456789 } } };
    const text = formatVendorResponse(response, "ncirf")!;
    expect(text).toContain('"colon": 0.00');
    expect(JSON.parse(text)).toEqual({ ...response, dose: { skin: 1301.60, colon: 0 }, error_percent: { skin: 1.23 } });
  });

  it("preserves ordinary JSON semantics and does not coerce legacy dose strings", () => {
    const response = { brain: "0.08", note: "quote: \"brain\": 1.23456\n", array: [null, 0.123456, { brain: 0.123456 }], empty: {}, absent: undefined };
    expect(formatVendorResponse(response, "ncict")).toBe(JSON.stringify(response, null, 2));
    expect(formatVendorResponse(response, "unknown")).toBe(JSON.stringify(response, null, 2));
    expect(formatVendorResponse(null, "ncict")).toBe("null");
    expect(formatVendorResponse(undefined, "ncict")).toBeUndefined();
  });
});
