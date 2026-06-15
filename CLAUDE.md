# Doorman

Automated callbox door-unlock. A callbox calls a Twilio number, Twilio POSTs to
`/api/answer`, and Doorman answers and plays the DTMF unlock digit when auto-unlock
is enabled. A web UI toggles auto-unlock. See `README.md` for end-user/Twilio setup.

## Commands

    pnpm install      # pnpm@11.6.0 is pinned (packageManager); README's "npm install" is stale
    pnpm dev          # dev server on http://localhost:3000
    pnpm build        # next build
    pnpm start        # serve production build

No lint or test scripts exist and there is no test framework. Formatting is
Prettier (`.prettierrc`) with **double quotes**.

## Docs & writing style

No AI-isms in any docs, comments, or commit messages:

- No em-dashes (`—`) or en-dashes (`–`). Use periods, commas, colons, or parentheses.
- Avoid filler buzzwords ("seamless", "robust", "delve", "leverage", "effortless").
- Write plainly and directly. Prefer short, concrete sentences.

## Architecture

- `src/app/api/answer/route.ts`: Twilio voice webhook (POST). Returns **TwiML XML**
  (`text/xml`), not JSON. Check order is blacklist, then whitelist, then
  `isUnlockAllowed`; records timestamps, then plays the unlock digit.
- `src/app/api/door/route.ts`: JSON REST for door state, `GET`/`PATCH`/`DELETE`
  (`force-dynamic`).
- `src/stores/door.ts`: Supabase data-access layer (`DoorStore`). `import "server-only"`;
  never import client-side.
- `src/schemas/door.ts`: Zod schemas (`Door`, `DoorUpdate`); the source of truth for shape.
- `src/hooks/useDoor/`: SWR hook with optimistic update plus revert on failure.
- `src/components/Controller/`: single-button toggle UI.
- `src/consts.ts`: tunable behavior (unlock digit, delays, refresh interval).
- `supabase/migrations/0001_door.sql`: schema.

## Rendering

**Client-side rendering and hydration only.** Render and hydrate the UI entirely
on the client. Never use server-side rendering (SSR) or server-side hydration.
UI components are Client Components (`"use client"`); do not render UI from Server
Components. This does not change the API route handlers in `src/app/api/*` or the
server-only `DoorStore`, which run on the server by design (they serve data, they
do not render UI).

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
- **React Compiler is on** (`next.config.ts`); manual `useMemo`/`useCallback` are
  usually unnecessary.
- **Phone lists** are parsed once at module load. Blacklist always rejects; whitelist
  is enforced only when non-empty.
- **Path alias:** `@/*` maps to `src/*`.

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
