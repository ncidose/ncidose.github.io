import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const portalBuild = process.env.VITE_PORTAL_STANDALONE === "true";

  return {
    publicDir: portalBuild ? false : "public",
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, portalBuild ? "src/portal.html" : "src/index.html"),
        },
      },
    },
  };
});
