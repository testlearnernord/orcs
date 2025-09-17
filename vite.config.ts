import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // IMPORTANT for GitHub Pages: emit relative asset URLs so the bundle works for
  // both project and user/organization pages (which serve from "/").
  base: "./",
  root: "src",
  publicDir: false,
  server: { open: true },
  build: {
    sourcemap: false,
    outDir: "../docs",
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@game": fileURLToPath(new URL("./src/game", import.meta.url)),
      "@sim": fileURLToPath(new URL("./src/sim", import.meta.url))
    }
  }
});
