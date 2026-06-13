# Migrate the data layer from Upstash Redis to Supabase

**Date:** 2026-06-13
**Status:** Approved design

## Motivation

Consolidate infrastructure: run the data layer on Supabase (Postgres) and drop the
Upstash Redis dependency. Same functionality — no new features, auth, multi-user,
or realtime. This is a backend swap behind a stable interface.

## Current state

The entire "database layer" is a single Upstash Redis key (`door:v1`) holding one
JSON blob, accessed only through `DoorStore` in `src/stores/door.ts`:

```ts
{ isUnlockAllowed: boolean,
  lastUnlockedAt: number | null,   // epoch ms
  lastAnsweredAt: number | null,
  lastRejectedAt: number | null }
```

Consumers:
- `src/app/api/door/route.ts` — GET / PATCH / DELETE over `DoorStore`.
- `src/app/api/answer/route.ts` — Twilio webhook; reads state, stamps timestamps.
- `src/hooks/useDoor/index.ts` → `src/components/Controller/index.tsx` — SWR client.

`DoorStore` already abstracts all storage behind `get` / `set` / `update` / `delete`,
so the migration is contained behind that interface plus a decision to move
timestamps to a proper `timestamptz` representation end-to-end.

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Client | `@supabase/supabase-js` (PostgREST/HTTP) | Direct analog to the Upstash REST client; no connection-pooling concerns under serverless/Fluid Compute; server-only. |
| Auth model | Service-role key + RLS enabled, **no policies** | All access is server-side. Service role bypasses RLS; anon/authenticated keys get zero access to the table. |
| Table shape | Single typed row with a singleton guard | Idiomatic Postgres; readable/editable in the Supabase dashboard. |
| Timestamps | `timestamptz` columns, **ISO strings end-to-end** | The app's `Door` type speaks ISO strings; no epoch math in the store. |
| Data migration | None | One tiny record; `get()` lazily initializes `DEFAULT_DOOR` (locked) when the row is absent — the safe state on cutover. |

## Database schema

```sql
create table door (
  id boolean primary key default true,
  is_unlock_allowed boolean not null default false,
  last_unlocked_at timestamptz,
  last_answered_at timestamptz,
  last_rejected_at timestamptz,
  constraint door_singleton check (id)
);

alter table door enable row level security;
-- No policies are created, on purpose. The server uses the service-role key,
-- which bypasses RLS. anon/authenticated keys cannot read or write this table.
```

The boolean primary key fixed to `true` plus `check (id)` means the table can
physically hold at most one row.

## Application changes

### `src/schemas/door.ts`

Timestamps become ISO strings; `isUnlockAllowed` is unchanged.

```ts
export const DoorSchema = z.object({
    isUnlockAllowed: z.boolean(),
    lastUnlockedAt: z.string().datetime({ offset: true }).nullable(),
    lastAnsweredAt: z.string().datetime({ offset: true }).nullable(),
    lastRejectedAt: z.string().datetime({ offset: true }).nullable(),
});
```

`DoorUpdateSchema = DoorSchema.partial()` is unchanged and inherits the new types.

**Why `{ offset: true }`:** PostgREST serializes `timestamptz` with a numeric
offset (e.g. `2026-06-13T12:34:56.789012+00:00`), while `new Date().toISOString()`
(written by the answer route) produces the `Z` form. `{ offset: true }` accepts
**both**, so validation passes whether a value was just written (`Z`) or re-read
from Postgres (`+00:00`). Because `set()` re-reads and returns the stored row, the
API response is always the canonical PostgREST form.

**Fallback:** if cutover verification surfaces a timestamp format Zod rejects, drop
to plain `z.string().nullable()` for the three fields.

### `src/stores/door.ts` (rewrite)

Swaps `@upstash/redis` for `@supabase/supabase-js`. Same method signatures.

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { Door, DoorSchema, DoorUpdate, DoorUpdateSchema } from "@/schemas/door";

const TABLE = "door";
const ROW_ID = true;

const DEFAULT_DOOR: Door = {
    isUnlockAllowed: false,
    lastUnlockedAt: null,
    lastAnsweredAt: null,
    lastRejectedAt: null,
};

const COLUMNS =
    "is_unlock_allowed, last_unlocked_at, last_answered_at, last_rejected_at";

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

### `src/app/api/answer/route.ts`

Three writes change from epoch ms to ISO strings:

- `DoorStore.update({ lastRejectedAt: Date.now() })` → `new Date().toISOString()`
- `DoorStore.update({ lastAnsweredAt: Date.now() })` → `new Date().toISOString()`
- `DoorStore.update({ lastUnlockedAt: Date.now() })` → `new Date().toISOString()`

No other logic changes.

### `src/components/Controller/index.tsx`

`renderDate`'s parameter type changes from `number | null` to `string | null`.
The body (`new Date(date).toLocaleString()`) and the `!date` guard work unchanged,
since `new Date()` accepts ISO strings.

## Dependencies & environment

`package.json`:
- Remove `@upstash/redis`.
- Add `@supabase/supabase-js`.

Environment variables:
- Remove `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

The service-role key is secret and server-only — never `NEXT_PUBLIC_`. The store is
already `import "server-only"`. Provisioning can be a standalone Supabase project or
the Vercel Marketplace Supabase integration (which injects the keys).

`README.md`: update the Prerequisites ("An Upstash Redis instance" → "A Supabase
project") and the Environment Variables block to match. (Pre-existing SMS drift in
the README is out of scope and left alone.)

## Error handling

Every Supabase call inspects its `error` and throws — no silent failures. This
mirrors the current code, which lets Redis errors propagate. Thrown errors surface
as 500s from the API routes, same as today.

## Verification (manual — no test harness exists in the repo)

1. Run the SQL migration in Supabase.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` locally; `npm run dev`.
3. `GET /api/door` → returns the default blob and creates the singleton row
   (confirm the row in the Supabase dashboard).
4. `PATCH /api/door` toggling `isUnlockAllowed` → row updates; the web UI reflects it.
5. Simulate the Twilio webhook: `POST /api/answer` with form field `From` →
   `last_answered_at` (and `last_unlocked_at` when enabled) stamp as `timestamptz`;
   the UI renders them via `toLocaleString()`.
6. Confirm the timestamp strings round-trip through `DoorSchema` without validation
   errors (the `{ offset: true }` check). If any are rejected, apply the
   `z.string().nullable()` fallback.

## Scope guardrails

No new features, no auth, no realtime, no multi-user. The `Door` field set and the
API route signatures are unchanged. Only storage backend and the timestamp
representation change.

## Files touched

- `src/stores/door.ts` — rewrite onto Supabase.
- `src/schemas/door.ts` — timestamp types → ISO strings.
- `src/app/api/answer/route.ts` — `Date.now()` → `new Date().toISOString()` (×3).
- `src/components/Controller/index.tsx` — `renderDate` parameter type.
- `package.json` — swap dependency.
- `README.md` — prerequisites + env vars.
- SQL migration — new (the `door` table + RLS above).
