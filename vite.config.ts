import { defineConfig } from "vite";

// IMPORTANT for GitHub Pages: base must match the repo name with leading/trailing slashes
export default defineConfig({
  base: "/orcs/",
  server: { open: true },
  build: { sourcemap: true, outDir: "dist" }
});
