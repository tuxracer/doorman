import { z } from "zod";

export const DoorSchema = z.object({
    isUnlockAllowed: z.boolean(),
    lastUnlockedAt: z.number().nullable(),
    lastAnsweredAt: z.number().nullable(),
    lastRejectedAt: z.number().nullable(),
});

export type Door = z.infer<typeof DoorSchema>;

export const DoorUpdateSchema = DoorSchema.partial();

export type DoorUpdate = z.infer<typeof DoorUpdateSchema>;
