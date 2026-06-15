import { useSyncExternalStore } from "react";

const subscribe = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

const getSnapshot = () => navigator.onLine;

// The app is client only, but a sane server snapshot avoids a flash if this
// ever runs outside the browser.
const getServerSnapshot = () => true;

/** Tracks whether the browser currently reports a network connection. */
export const useOnlineStatus = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
