const portalStyleMarker = "--ncidose-styles-ready";
const portalStyleRetryKey = "ncidose-portal-style-retry";

type PortalStyleStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type PortalStyleRecoveryOptions = {
  readMarker?: () => string;
  storage?: PortalStyleStorage;
  reload?: () => void;
};

export const recoverMissingPortalStyles = ({
  readMarker = () => window.getComputedStyle(document.documentElement).getPropertyValue(portalStyleMarker).trim(),
  storage = window.sessionStorage,
  reload = () => window.location.reload(),
}: PortalStyleRecoveryOptions = {}) => {
  if (readMarker() === "1") {
    try {
      storage.removeItem(portalStyleRetryKey);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    return false;
  }

  try {
    if (storage.getItem(portalStyleRetryKey) === "1") return false;
    storage.setItem(portalStyleRetryKey, "1");
  } catch {
    return false;
  }

  reload();
  return true;
};
