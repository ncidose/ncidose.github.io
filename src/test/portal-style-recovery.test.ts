import { describe, expect, it, vi } from "vitest";
import { recoverMissingPortalStyles } from "@/lib/portalStyleRecovery";

const storage = (retried: boolean) => ({
  getItem: vi.fn(() => retried ? "1" : null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});

describe("portal stylesheet recovery", () => {
  it("clears the retry guard when the stylesheet marker is present", () => {
    const session = storage(true);
    const reload = vi.fn();

    expect(recoverMissingPortalStyles({ readMarker: () => "1", storage: session, reload })).toBe(false);
    expect(session.removeItem).toHaveBeenCalledWith("ncidose-portal-style-retry");
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads once when the stylesheet marker is missing", () => {
    const session = storage(false);
    const reload = vi.fn();

    expect(recoverMissingPortalStyles({ readMarker: () => "", storage: session, reload })).toBe(true);
    expect(session.setItem).toHaveBeenCalledWith("ncidose-portal-style-retry", "1");
    expect(reload).toHaveBeenCalledOnce();
  });

  it("does not enter a reload loop when recovery already ran", () => {
    const session = storage(true);
    const reload = vi.fn();

    expect(recoverMissingPortalStyles({ readMarker: () => "", storage: session, reload })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
