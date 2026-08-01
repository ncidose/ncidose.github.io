import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeAnalytics } from "./lib/analytics.ts";

if (import.meta.env.VITE_PORTAL_STANDALONE === "true" && (!window.location.hash || window.location.hash === "#/")) {
  window.location.hash = "/portal";
}

initializeAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
