import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// IMPORTANT for GitHub Pages: base must match the repo name with leading/trailing slashes
export default defineConfig({
  base: "/orcs/",
  server: { open: true },
  build: { sourcemap: true, outDir: "dist" },
  resolve: {
    alias: {
      "@game": fileURLToPath(new URL("./src/game", import.meta.url)),
      "@sim": fileURLToPath(new URL("./src/sim", import.meta.url))
    }
  }
});
