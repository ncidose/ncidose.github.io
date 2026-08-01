import { createRoot } from "react-dom/client";
import PortalApp from "./PortalApp.tsx";
import "./index.css";
import { initializeAnalytics } from "./lib/analytics.ts";

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = "/portal";
}

initializeAnalytics();

createRoot(document.getElementById("root")!).render(<PortalApp />);
