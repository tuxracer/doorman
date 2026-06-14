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
