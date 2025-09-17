import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// IMPORTANT for GitHub Pages: base must match the repo name with leading/trailing slashes
export default defineConfig({
  base: "/orcs/",
  root: "src",
  publicDir: false,
  server: { open: true },

  resolve: {
    alias: {
      "@game": fileURLToPath(new URL("./src/game", import.meta.url)),
      "@sim": fileURLToPath(new URL("./src/sim", import.meta.url))
    }
  }
});
