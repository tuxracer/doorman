import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import devServer from "@hono/vite-dev-server";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Doorman",
        short_name: "Doorman",
        description: "Buzz callers in from your phone.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#14110d",
        background_color: "#14110d",
      },
      pwaAssets: {
        config: true,
        overrideManifestIcons: true,
        injectThemeColor: false,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
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
