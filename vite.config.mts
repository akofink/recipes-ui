import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = import.meta.dirname;

function copyGeneratedFiles() {
  return {
    name: "copy-generated-files",
    closeBundle() {
      const generated = resolve(root, "src/generated");
      const output = resolve(root, "dist");

      if (!existsSync(generated)) {
        throw new Error(
          "Generated files are missing. Run `pnpm run generate` first.",
        );
      }

      cpSync(resolve(generated, "static"), resolve(output, "static"), {
        recursive: true,
      });
      cpSync(
        resolve(generated, "recipes.json"),
        resolve(output, "static/recipes.json"),
      );
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [react(), copyGeneratedFiles()],
  server: {
    allowedHosts: true,
    host: process.env.HOST || "0.0.0.0",
    port: Number(process.env.PORT) || 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendors";
          }
        },
      },
    },
  },
});
