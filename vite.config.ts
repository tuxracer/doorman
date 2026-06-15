import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import devServer from "@hono/vite-dev-server";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    // Run the Hono app inside the dev server. Everything that is not an
    // /api route is excluded here so Vite serves the SPA and its assets.
    devServer({
      entry: "src/server/app.ts",
      exclude: [/^(?!\/api).*/],
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
