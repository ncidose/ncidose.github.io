import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeAnalytics } from "./lib/analytics.ts";

initializeAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
