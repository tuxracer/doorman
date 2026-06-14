import "server-only";
import { createClient } from "@supabase/supabase-js";
import { Door, DoorSchema, DoorUpdate, DoorUpdateSchema } from "@/schemas/door";

const TABLE = "door";
// Matches `id boolean primary key default true` in the migration — enforces a single row.
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
