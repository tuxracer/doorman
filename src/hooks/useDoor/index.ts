import { useState } from "react";
import useSWR from "swr";
import { Door, DoorSchema, DoorUpdate } from "@/schemas/door";
import { DOOR_STATUS_REFRESH_INTERVAL_MS } from "@/consts";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const fetcher = async (url: string): Promise<Door> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch door: ${res.status} ${res.statusText}`);
  }
  return res.json();
};

export const useDoor = () => {
  const online = useOnlineStatus();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<Door>(
    "/api/door",
    fetcher,
    {
      refreshInterval: DOOR_STATUS_REFRESH_INTERVAL_MS,
      onSuccess: () => setLastUpdatedAt(new Date().toISOString()),
    },
  );

  // Offline when the browser reports no connection, or when the latest poll
  // failed. SWR clears `error` on the next successful fetch and revalidates on
  // reconnect by default, so recovery is automatic.
  const isOffline = !online || Boolean(error);

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
    isOffline,
    lastUpdatedAt,
  };
};
