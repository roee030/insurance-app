import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Repo name used for the GitHub Pages sub-path (https://<user>.github.io/<repo>/).
// Only applied for the "demo" build mode — local dev and the real deploy stay at "/".
const PAGES_REPO = "insurance-app";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  base: mode === "demo" ? `/${PAGES_REPO}/` : "/",
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
}));
