import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeAnalytics } from "./lib/analytics.ts";

initializeAnalytics();

const legacyHashDestination = () => {
  const legacyHash = window.location.hash;
  if (!legacyHash.startsWith("#/")) return null;

  const legacyRoute = legacyHash.slice(1);
  const nestedHashIndex = legacyRoute.indexOf("#");
  const pathAndSearch = nestedHashIndex >= 0
    ? legacyRoute.slice(0, nestedHashIndex)
    : legacyRoute;
  const section = nestedHashIndex >= 0
    ? legacyRoute.slice(nestedHashIndex + 1)
    : "";

  if (pathAndSearch === "/tools" && /^(ncict|ncirf|ncinm|phantom)$/.test(section)) {
    return `/tools/${section}`;
  }

  if (pathAndSearch === "/documentation") return "/manuals";
  if (pathAndSearch === "/questions" || pathAndSearch.startsWith("/questions/")) {
    return pathAndSearch.replace(/^\/questions/, "/discussions");
  }

  return `${pathAndSearch}${section ? `#${section}` : ""}`;
};

const legacyDestination = legacyHashDestination();
if (legacyDestination) {
  window.location.replace(legacyDestination);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
