import { handle } from "hono/vercel";
import app from "../src/server/app.js";

// Vercel maps this file to /api/door and runs the existing Hono app as a
// Function. Hono matches the full request path, so the routes defined in
// src/server/app.ts handle it unchanged.
export const runtime = "nodejs";

export const GET = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
