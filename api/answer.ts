import { handle } from "hono/vercel";
import app from "../src/server/app";

// Vercel maps this file to /api/answer (the Twilio voice webhook) and runs
// the existing Hono app as a Function.
export const runtime = "nodejs";

export const POST = handle(app);
