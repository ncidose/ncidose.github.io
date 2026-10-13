import { createRoot } from "react-dom/client";
import PortalApp from "./PortalApp.tsx";
import "./index.css";
import { initializeAnalytics } from "./lib/analytics.ts";
import { recoverMissingPortalStyles } from "./lib/portalStyleRecovery.ts";

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = "/portal";
}

initializeAnalytics();

window.addEventListener("load", recoverMissingPortalStyles, { once: true });

createRoot(document.getElementById("root")!).render(<PortalApp />);
