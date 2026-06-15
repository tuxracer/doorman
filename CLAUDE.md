# Doorman

Automated callbox door-unlock. A callbox calls a Twilio number, Twilio POSTs to
`/api/answer`, and Doorman answers and plays the DTMF unlock digit when auto-unlock
is enabled. A web UI toggles auto-unlock. See `README.md` for end-user/Twilio setup.

## Commands

    pnpm install      # pnpm@11.6.0 is pinned (packageManager)
    pnpm dev          # Vite dev server on http://localhost:5173 (SPA + Hono /api in one process)
    pnpm build        # vite build (SPA to dist/) then vite build --ssr (server to dist-server/)
    pnpm start        # node dist-server/node.js (serves dist/ and /api on one port)

No lint or test scripts exist and there is no test framework. Formatting is
Prettier (`.prettierrc`) with **double quotes**.

## Docs & writing style

No AI-isms in any docs, comments, or commit messages:

- No em-dashes (`—`) or en-dashes (`–`). Use periods, commas, colons, or parentheses.
- Avoid filler buzzwords ("seamless", "robust", "delve", "leverage", "effortless").
- Write plainly and directly. Prefer short, concrete sentences.

## Architecture

- `src/server/app.ts`: Hono app with all `/api` routes.
  - `POST /api/answer`: Twilio voice webhook. Returns **TwiML XML** (`text/xml`), not
    JSON. Check order is blacklist, then whitelist, then `isUnlockAllowed`; records
    timestamps, then plays the unlock digit.
  - `GET`/`PATCH`/`DELETE /api/door`: JSON REST for door state.
- `src/server/node.ts`: production entry. Serves the built SPA from `dist/` and the
  `/api` routes via `@hono/node-server` on one port.
- `api/door.ts`, `api/answer.ts`: thin Vercel Function adapters. Each wraps the same
  Hono `app` with `hono/vercel`'s `handle` so `/api/*` runs as Vercel Functions
  (Vercel's Vite preset only serves static files, it does not run `node.ts`).
- `index.html` + `src/main.tsx`: Vite SPA entry; mounts `<Controller />` on the client.
- `vite.config.ts`: `@hono/vite-dev-server` runs the Hono app inside the dev server so
  `/api/*` works under `pnpm dev`; also the Tailwind and React Compiler plugins.
- `src/stores/door.ts`: Supabase data-access layer (`DoorStore`). Server-only by
  design (reads `SUPABASE_SECRET_KEY`); never import it from client code. Only
  `src/server/app.ts` imports it.
- `src/schemas/door.ts`: Zod schemas (`Door`, `DoorUpdate`); the source of truth for shape.
- `src/hooks/useDoor/`: SWR hook with optimistic update plus revert on failure.
- `src/components/Controller/`: single-button toggle UI.
- `src/consts.ts`: tunable behavior (unlock digit, delays, refresh interval).
- `supabase/migrations/0001_door.sql`: schema.

## Rendering

**Client-side rendering only.** The UI is a Vite SPA: `index.html` loads
`src/main.tsx`, which mounts `<Controller />` in the browser. There is no SSR and no
server-side hydration. This is separate from the Hono server in `src/server/*`, which
runs on the server by design (it serves data and TwiML, it does not render UI).

## Patterns & gotchas

- **Single-row table.** `door.id` is `boolean primary key default true` with a
  `check (id)` constraint, so exactly one row can exist. The store always uses
  `id = true` (`ROW_ID`); `DoorStore.get()` lazily creates the default row if missing.
- **snake_case vs camelCase.** DB is snake_case, app is camelCase. `fromRow`/`toRow`
  in the store are the only translation layer. Keep them in sync with schema and migration.
- **Supabase is server-only.** Server uses `SUPABASE_SECRET_KEY` (bypasses RLS). RLS
  is enabled with **no policies**, so anon/publishable keys get zero access. All
  reads/writes must go through `DoorStore`.
- **Twilio is TwiML-only.** The `twilio` package is used solely to build TwiML
  (no credentials needed). `TWILIO_*`, `NOTIFY_PHONE_NUMBER`, and SMS notification are
  in the README but **not yet implemented**.
- **React Compiler is on** (via `@vitejs/plugin-react` + `babel-plugin-react-compiler`
  in `vite.config.ts`); manual `useMemo`/`useCallback` are usually unnecessary.
- **Phone lists** are parsed once at module load. Blacklist always rejects; whitelist
  is enforced only when non-empty.
- **Path alias:** `@/*` maps to `src/*` (configured in `vite.config.ts` and `tsconfig.json`).
  Exception: the server import graph (`api/*`, `src/server/*`, `src/stores/door.ts`) uses
  relative imports with explicit `.js` extensions. Vercel compiles each Function file to
  ESM without bundling, so Node ESM needs the extension at runtime and cannot resolve `@/`.
  Vite and tsc (`moduleResolution: "bundler"`) map the `.js` specifier back to the `.ts`
  source, so local dev and the build still work. Do not drop these extensions.

## Environment

Consumed by code today: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
`WHITE_LISTED_PHONE_NUMBERS`, `BLACK_LISTED_PHONE_NUMBERS`. Local dev loads
`.env.local` via direnv (`.envrc`). Full list in `README.md`.

## Git

Remotes: `origin` (GitHub) and `codeberg`.

**Never add merge commits to `main`.** Keep history strictly linear: always rebase
work onto the latest `main`, then integrate via fast-forward only. Do feature work
on a branch, `git rebase main` to update it, and land it with a fast-forward merge
(`git merge --ff-only`). Never use `git merge` (no-ff) or a merge commit.

**Never push to remotes** (`origin`, `codeberg`). The maintainer pushes manually.
Do not run `git push`, and do not ask whether to push. Stop after committing locally.

**`docs/superpowers/` is gitignored** (`.gitignore:41`). Brainstorm specs and plans
written there are intentionally kept local and untracked, so new files under it will
not show in `git status`. That is expected, not a mistake.
