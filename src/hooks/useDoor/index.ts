import useSWR from "swr";
import { Door, DoorSchema, DoorUpdate, DoorUpdateSchema } from "@/schemas/door";

export const useDoor = () => {
    const fetcher = (url: string) => fetch(url).then(res => res.json());
    const { data, error, isLoading, mutate } = useSWR<Door>("/api/door", fetcher);

    const update = async (update: DoorUpdate) => {
        // optimistic update, if possible
        if (data) {
            const updatedDoor = { ...data, ...update };
            mutate(updatedDoor, false);
        }

        try {
            const response = await fetch("/api/door", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(update),
            });

            if (!response.ok) {
                throw new Error(`Failed to update door: ${response.statusText}`);
            }

            const doorResponseJSON = DoorSchema.parse(await response.json());
            mutate(doorResponseJSON, false);

            return doorResponseJSON;
        } catch (err) {
            // revert optimistic update
            mutate(data, false);
            throw err;
        }
    };

    return {
        data,
        error,
        isLoading,
        update,
    };
};
