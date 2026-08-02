import { describe, expect, it } from "vitest";
import { normalizePortalEmail } from "../../scripts/portal/worker.js";

describe("portal email normalization", () => {
  it("normalizes a valid approved email", () => {
    expect(normalizePortalEmail("  Researcher@University.EDU ")).toBe("researcher@university.edu");
  });

  it("rejects malformed email values", () => {
    expect(normalizePortalEmail("not-an-email")).toBe("");
    expect(normalizePortalEmail("person@example")).toBe("");
  });
});
