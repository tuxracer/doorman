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
