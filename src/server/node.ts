import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import app from "./app";

// Serve built static assets, falling back to the SPA entry for any
// route that is not an /api route or a real file. The /api routes are
// registered first (in app.ts), so they take precedence.
app.use("/*", serveStatic({ root: "./dist" }));
app.get("/*", serveStatic({ path: "./dist/index.html" }));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Doorman listening on http://localhost:${port}`);
});
