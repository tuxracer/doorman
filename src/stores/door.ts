import "server-only";
import { Redis } from "@upstash/redis";
import { Door, DoorSchema, DoorUpdate, DoorUpdateSchema } from "@/schemas/door";

const KEY = "door:v1";

const DEFAULT_DOOR: Door = {
    isUnlockAllowed: false,
    lastUnlockedAt: null,
    lastAnsweredAt: null,
    lastRejectedAt: null,
};

const redis = Redis.fromEnv();

export const DoorStore = {
    async get(): Promise<Door> {
        const raw = await redis.get<unknown>(KEY);
        if (raw === null) {
            return this.set(DEFAULT_DOOR);
        }
        return DoorSchema.parse(raw);
    },

    async set(next: Door): Promise<Door> {
        const valid = DoorSchema.parse(next);
        await redis.set(KEY, valid);
        return valid;
    },

    async update(update: DoorUpdate): Promise<Door> {
        const patch = DoorUpdateSchema.parse(update);
        const current = await this.get();
        return this.set({ ...current, ...patch });
    },

    async delete(): Promise<void> {
        await redis.del(KEY);
    },
};
