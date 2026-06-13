# Redis → Supabase Data Layer Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-key Upstash Redis store with a Supabase (Postgres) `door` table, keeping the `DoorStore` interface and all API/UI behavior identical, while moving timestamps to `timestamptz` represented as ISO strings end-to-end.

**Architecture:** All storage lives behind `DoorStore` in `src/stores/door.ts`. The migration rewrites that store on `@supabase/supabase-js` (PostgREST/HTTP, service-role key, RLS with no policies), and switches the three `Door` timestamp fields from epoch-ms numbers to ISO 8601 strings. The schema change ripples into the answer webhook (`Date.now()` → `new Date().toISOString()`) and the controller's `renderDate` parameter type. Because these changes are type-coupled, they land in one commit so the project always typechecks.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod 4, `@supabase/supabase-js`, Supabase Postgres.

**Testing note:** This repo has no unit-test harness, and adding one (plus Supabase mocks) is out of scope. The per-task gate is `npx tsc --noEmit`; end-to-end correctness is verified manually against a live Supabase project in Task 5.

---

### Task 1: Create the SQL migration

**Files:**
- Create: `supabase/migrations/0001_door.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0001_door.sql`:

```sql
-- Single-row "door" state table. Replaces the Upstash Redis key `door:v1`.
create table door (
  id boolean primary key default true,
  is_unlock_allowed boolean not null default false,
  last_unlocked_at timestamptz,
  last_answered_at timestamptz,
  last_rejected_at timestamptz,
  constraint door_singleton check (id)
);

-- Lock the table down. The server uses the service-role key, which bypasses RLS.
-- No policies are created, so anon/authenticated keys get zero access.
alter table door enable row level security;
```

- [ ] **Step 2: Sanity-check the SQL**

Read the file back and confirm: boolean PK fixed to `true` + `check (id)` (singleton), three `timestamptz` columns, RLS enabled, no policies.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_door.sql
git commit -m "feat: add door table migration for Supabase"
```

---

### Task 2: Add the Supabase client dependency

**Files:**
- Modify: `package.json`, `package-lock.json`

> Add `@supabase/supabase-js` **without** removing `@upstash/redis` yet — the store still imports Redis until Task 3, so the project must keep compiling.

- [ ] **Step 1: Install the package**

Run:

```bash
npm install @supabase/supabase-js
```

Expected: `package.json` gains `@supabase/supabase-js` under `dependencies`; lockfile updates; no errors.

- [ ] **Step 2: Verify the project still typechecks**

Run:

```bash
npx tsc --noEmit
```

Expected: exits 0 (the codebase is unchanged except for the new, unused dependency).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add @supabase/supabase-js dependency"
```

---

### Task 3: Migrate schema, store, webhook, and controller (atomic, type-coupled change)

**Files:**
- Modify: `src/schemas/door.ts`
- Modify: `src/stores/door.ts` (full rewrite)
- Modify: `src/app/api/answer/route.ts:21`, `:31`, `:52`
- Modify: `src/components/Controller/index.tsx:12`
- Modify: `package.json`, `package-lock.json` (remove `@upstash/redis`)

> These edits are all bound by the `Door` type. They land together so `npx tsc --noEmit` is the single gate for the whole set. Intermediate steps are not expected to typecheck on their own; the verification runs after Step 5.

- [ ] **Step 1: Switch the timestamp fields to ISO strings**

In `src/schemas/door.ts`, replace the three `z.number().nullable()` lines so the schema reads exactly:

```ts
import { z } from "zod";

export const DoorSchema = z.object({
    isUnlockAllowed: z.boolean(),
    lastUnlockedAt: z.string().datetime({ offset: true }).nullable(),
    lastAnsweredAt: z.string().datetime({ offset: true }).nullable(),
    lastRejectedAt: z.string().datetime({ offset: true }).nullable(),
});

export type Door = z.infer<typeof DoorSchema>;

export const DoorUpdateSchema = DoorSchema.partial();

export type DoorUpdate = z.infer<typeof DoorUpdateSchema>;
```

`{ offset: true }` accepts both `…Z` (written by `new Date().toISOString()`) and `…+00:00` (returned by PostgREST). If Task 5 verification surfaces a rejected format, fall back to `z.string().nullable()` for the three fields.

- [ ] **Step 2: Rewrite the store onto Supabase**

Replace the entire contents of `src/stores/door.ts` with:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { Door, DoorSchema, DoorUpdate, DoorUpdateSchema } from "@/schemas/door";

const TABLE = "door";
const ROW_ID = true;

const COLUMNS =
    "is_unlock_allowed, last_unlocked_at, last_answered_at, last_rejected_at";

const DEFAULT_DOOR: Door = {
    isUnlockAllowed: false,
    lastUnlockedAt: null,
    lastAnsweredAt: null,
    lastRejectedAt: null,
};

type DoorRow = {
    is_unlock_allowed: boolean;
    last_unlocked_at: string | null;
    last_answered_at: string | null;
    last_rejected_at: string | null;
};

const fromRow = (row: DoorRow): Door => ({
    isUnlockAllowed: row.is_unlock_allowed,
    lastUnlockedAt: row.last_unlocked_at,
    lastAnsweredAt: row.last_answered_at,
    lastRejectedAt: row.last_rejected_at,
});

const toRow = (door: Door): DoorRow => ({
    is_unlock_allowed: door.isUnlockAllowed,
    last_unlocked_at: door.lastUnlockedAt,
    last_answered_at: door.lastAnsweredAt,
    last_rejected_at: door.lastRejectedAt,
});

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
);

export const DoorStore = {
    async get(): Promise<Door> {
        const { data, error } = await supabase
            .from(TABLE)
            .select(COLUMNS)
            .eq("id", ROW_ID)
            .maybeSingle();
        if (error) throw error;
        if (!data) return this.set(DEFAULT_DOOR);
        return DoorSchema.parse(fromRow(data as DoorRow));
    },

    async set(next: Door): Promise<Door> {
        const valid = DoorSchema.parse(next);
        const { data, error } = await supabase
            .from(TABLE)
            .upsert({ id: ROW_ID, ...toRow(valid) })
            .select(COLUMNS)
            .single();
        if (error) throw error;
        return DoorSchema.parse(fromRow(data as DoorRow));
    },

    async update(update: DoorUpdate): Promise<Door> {
        const patch = DoorUpdateSchema.parse(update);
        const current = await this.get();
        return this.set({ ...current, ...patch });
    },

    async delete(): Promise<void> {
        const { error } = await supabase.from(TABLE).delete().eq("id", ROW_ID);
        if (error) throw error;
    },
};
```

- [ ] **Step 3: Update the answer webhook to write ISO strings**

In `src/app/api/answer/route.ts`, change the three timestamp writes:

- Line ~21: `await DoorStore.update({ lastRejectedAt: Date.now() });`
  → `await DoorStore.update({ lastRejectedAt: new Date().toISOString() });`
- Line ~31: `await DoorStore.update({ lastAnsweredAt: Date.now() });`
  → `await DoorStore.update({ lastAnsweredAt: new Date().toISOString() });`
- Line ~52: `await DoorStore.update({ lastUnlockedAt: Date.now() });`
  → `await DoorStore.update({ lastUnlockedAt: new Date().toISOString() });`

No other logic in this file changes.

- [ ] **Step 4: Update the controller's renderDate type**

In `src/components/Controller/index.tsx`, line ~12, change the parameter type only:

```ts
const renderDate = (date?: string | null) => {
```

The body (`new Date(date).toLocaleString()`) and the `!date` guard are unchanged — `new Date()` accepts ISO strings.

- [ ] **Step 5: Remove the Upstash dependency**

Run:

```bash
npm uninstall @upstash/redis
```

Expected: `@upstash/redis` removed from `package.json` and lockfile. No source file imports it anymore (only `src/stores/door.ts` did, and it was rewritten in Step 2).

- [ ] **Step 6: Verify the whole change typechecks**

Run:

```bash
npx tsc --noEmit
```

Expected: exits 0. If it fails, the most likely cause is a leftover epoch-ms `number` reference to a `Door` timestamp field — fix it to a string.

- [ ] **Step 7: Commit**

```bash
git add src/schemas/door.ts src/stores/door.ts \
  src/app/api/answer/route.ts src/components/Controller/index.tsx \
  package.json package-lock.json
git commit -m "feat: migrate door store from Upstash Redis to Supabase"
```

---

### Task 4: Update the README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update Prerequisites**

In `README.md`, under Prerequisites, replace:

```
- An Upstash Redis instance
```

with:

```
- A Supabase project
```

- [ ] **Step 2: Update the Environment Variables block**

In the `.env.local` example block, replace these two lines:

```
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

with:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Leave the Twilio and phone-number variables unchanged. (The pre-existing SMS mentions in the README are out of scope for this migration.)

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README for Supabase env vars"
```

---

### Task 5: End-to-end verification against a live Supabase project

**Files:** none (operational verification)

> Requires a real Supabase project. The store calls `createClient` at module load, so `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be set before the dev server starts.

- [ ] **Step 1: Apply the migration**

Run the contents of `supabase/migrations/0001_door.sql` in the Supabase SQL editor (or via `supabase db push` if the Supabase CLI is set up). Confirm the `door` table exists and RLS is enabled.

- [ ] **Step 2: Configure env and start the app**

Add to `.env.local`:

```
SUPABASE_URL=...           # Project URL (Settings → API)
SUPABASE_SERVICE_ROLE_KEY=...   # service_role secret (Settings → API)
```

Then run:

```bash
npm run dev
```

Expected: server starts with no module-load error from `createClient`.

- [ ] **Step 2.5: Confirm a production build still works**

Run:

```bash
npm run build
```

Expected: build succeeds (env vars are loaded from `.env.local`). This catches issues `tsc` alone won't, since the store instantiates the client at import time.

- [ ] **Step 3: Lazy init via GET**

Run:

```bash
curl -s localhost:3000/api/door
```

Expected: `{"isUnlockAllowed":false,"lastUnlockedAt":null,"lastAnsweredAt":null,"lastRejectedAt":null}`. Confirm a single row now exists in the Supabase `door` table.

- [ ] **Step 4: Toggle via PATCH**

Run:

```bash
curl -s -X PATCH localhost:3000/api/door \
  -H 'Content-Type: application/json' \
  -d '{"isUnlockAllowed":true}'
```

Expected: response shows `"isUnlockAllowed":true`; the dashboard row updates. Load the web UI and confirm the button reflects "enabled".

- [ ] **Step 5: Stamp a timestamp via the webhook**

Run:

```bash
curl -s -X POST localhost:3000/api/answer \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'From=%2B15555550123'
```

Expected: TwiML XML response. `GET /api/door` now shows `lastAnsweredAt` (and `lastUnlockedAt`, since unlocking was enabled in Step 4) as ISO strings — and crucially, the response parses without a Zod error, confirming the `{ offset: true }` format check accepts the PostgREST `+00:00` form. The web UI renders the times via `toLocaleString()`.

- [ ] **Step 6: Confirm DELETE re-initializes**

Run:

```bash
curl -s -X DELETE localhost:3000/api/door -o /dev/null -w '%{http_code}\n'
curl -s localhost:3000/api/door
```

Expected: `204`, then a fresh default blob (row recreated by lazy init).

- [ ] **Step 7 (only if Step 5 fails on validation):** Apply the fallback — change the three timestamp fields in `src/schemas/door.ts` from `z.string().datetime({ offset: true }).nullable()` to `z.string().nullable()`, re-run `npx tsc --noEmit`, repeat Step 5, and commit with `fix: relax door timestamp validation to plain ISO strings`.

---

## Self-Review

**Spec coverage:**
- Client = `@supabase/supabase-js`, service-role + RLS no-policies → Task 3 store + Task 1 SQL. ✓
- Single typed row + singleton guard → Task 1. ✓
- `timestamptz`, ISO strings end-to-end → Task 1 (columns) + Task 3 (schema/webhook/controller). ✓
- Lazy `DEFAULT_DOOR` init, no data migration → Task 3 store `get()`; verified Task 5 Step 3/6. ✓
- Env swap + dependency swap → Task 2 (add), Task 3 Step 5 (remove), Task 5 Step 2 (config), Task 4 (docs). ✓
- README updates → Task 4. ✓
- Error handling (throw on Supabase error) → Task 3 store. ✓
- `{ offset: true }` sharp edge + `z.string()` fallback → Task 3 Step 1, Task 5 Step 5/7. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; commands have expected output. ✓

**Type consistency:** `Door` timestamp fields are `string | null` everywhere — schema (Task 3.1), `DoorRow`/`fromRow`/`toRow` (Task 3.2), webhook writes `new Date().toISOString()` (Task 3.3), `renderDate(date?: string | null)` (Task 3.4). `DoorStore` keeps `get`/`set`/`update`/`delete` signatures. Column list `COLUMNS` matches `DoorRow` keys and the Task 1 table columns. ✓
