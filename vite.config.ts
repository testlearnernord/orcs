import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({

  resolve: {
    alias: {
      "@game": fileURLToPath(new URL("./src/game", import.meta.url)),
      "@sim": fileURLToPath(new URL("./src/sim", import.meta.url))
    }
  }
});
