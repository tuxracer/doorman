import { useEffect, useState } from "react";
import { useDoor } from "@/hooks/useDoor";
import { DOOR_STATUS_REFRESH_INTERVAL_MS } from "@/consts";
import { Toggle } from "./Toggle";
import { KeyIcon } from "./icons";
import { formatExact, formatRelative } from "./time";

/** Re-render on an interval so the ledger's relative times stay honest between fetches. */
const useNow = (intervalMs: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

const COPY = {
  live: {
    headline: "Admitting guests",
    sub: "Every caller is buzzed in automatically.",
    badge: "On duty",
    hint: "Tap to lock the door",
  },
  secure: {
    headline: "Door secured",
    sub: "The door will not unlock for callers.",
    badge: "Off duty",
    hint: "Tap to admit callers",
  },
  idle: {
    headline: "Reaching the door",
    sub: "Reading the latest state.",
    badge: "Syncing",
    hint: "One moment",
  },
} as const;

export const Controller: React.FC = () => {
  const { data, error, isLoading, update } = useDoor();
  const now = useNow(DOOR_STATUS_REFRESH_INTERVAL_MS ?? 30_000);

  if (error && !data) {
    return <ErrorPanel message={error.message} />;
  }

  const isUnlockAllowed = data?.isUnlockAllowed ?? null;
  const state: "live" | "secure" | "idle" =
    isUnlockAllowed === null ? "idle" : isUnlockAllowed ? "live" : "secure";
  const copy = COPY[state];

  const ledger = [
    {
      key: "unlocked",
      label: "Last unlocked",
      color: "var(--good)",
      value: data?.lastUnlockedAt,
    },
    {
      key: "answered",
      label: "Last answered",
      color: "var(--info)",
      value: data?.lastAnsweredAt,
    },
    {
      key: "declined",
      label: "Last declined",
      color: "var(--bad)",
      value: data?.lastRejectedAt,
    },
  ];

  return (
    <main className="dm-stage" data-state={state}>
      <div className="dm-glow" />
      <div className="dm-grain" />

      <section className="dm-panel">
        <header
          className="dm-rise flex items-center justify-between gap-4"
          style={{ animationDelay: "40ms" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-full border"
              style={{
                borderColor: "rgba(var(--accent-rgb), 0.4)",
                background: "rgba(var(--accent-rgb), 0.1)",
                color: "var(--accent-text)",
              }}
            >
              <KeyIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="dm-display text-[1.6rem] leading-none">
              Doorman
            </span>
          </div>
          <span className="dm-badge dm-eyebrow">
            <span className="dm-badge-dot" />
            {copy.badge}
          </span>
        </header>

        <div
          className="dm-rise mt-9 text-center sm:mt-10"
          style={{ animationDelay: "120ms" }}
        >
          <p className="dm-eyebrow" style={{ color: "var(--accent-text)" }}>
            Auto-unlock
          </p>
          {state === "idle" ? (
            <div className="mx-auto mt-4 h-9 w-56 dm-skeleton" />
          ) : (
            <h1 className="dm-display mt-3 text-[2.4rem] sm:text-[2.7rem]">
              {copy.headline}
            </h1>
          )}
          <p
            className="mx-auto mt-3 max-w-[19rem] text-[0.95rem] leading-relaxed"
            style={{ color: "var(--text-dim)" }}
          >
            {copy.sub}
          </p>
        </div>

        <div
          className="dm-rise mt-9 flex flex-col items-center gap-4"
          style={{ animationDelay: "200ms" }}
        >
          <Toggle
            checked={isUnlockAllowed}
            disabled={isLoading && !data}
            onChange={(next) => update({ isUnlockAllowed: next })}
          />
          <p className="dm-eyebrow" style={{ color: "var(--text-faint)" }}>
            {copy.hint}
          </p>
        </div>

        <hr
          className="dm-rule dm-rise mt-9"
          style={{ animationDelay: "260ms" }}
        />

        <div className="dm-rise mt-3" style={{ animationDelay: "320ms" }}>
          {ledger.map((row) => (
            <div key={row.key} className="dm-row">
              <div className="flex items-center gap-3">
                <span
                  className="dm-row-dot"
                  style={{ background: row.color, color: row.color }}
                />
                <span
                  className="dm-eyebrow"
                  style={{ color: "var(--text-dim)" }}
                >
                  {row.label}
                </span>
              </div>
              <span
                className="dm-mono text-[0.82rem] tabular-nums"
                style={{ color: "var(--text)" }}
                title={formatExact(row.value)}
              >
                {isLoading && !data ? "—" : formatRelative(row.value, now)}
              </span>
            </div>
          ))}
        </div>

        <footer
          className="dm-rise mt-6 flex items-center justify-center gap-2"
          style={{ animationDelay: "380ms" }}
        >
          <span className="dm-live-dot" />
          <span className="dm-eyebrow" style={{ color: "var(--text-faint)" }}>
            Live
          </span>
        </footer>
      </section>
    </main>
  );
};

const ErrorPanel: React.FC<{ message: string }> = ({ message }) => (
  <main className="dm-stage" data-state="secure">
    <div className="dm-glow" />
    <div className="dm-grain" />
    <section className="dm-panel text-center">
      <span
        className="mx-auto grid h-12 w-12 place-items-center rounded-full border"
        style={{
          borderColor: "transparent",
          background: "rgba(224, 121, 95, 0.12)",
          color: "var(--bad)",
        }}
      >
        <KeyIcon className="h-5 w-5" />
      </span>
      <h1 className="dm-display mt-5 text-[2rem]">Can't reach the door</h1>
      <p
        className="mx-auto mt-3 max-w-[20rem] text-[0.95rem] leading-relaxed"
        style={{ color: "var(--text-dim)" }}
      >
        The doorman isn't answering right now. It will keep trying on its own.
      </p>
      <p
        className="dm-mono mx-auto mt-4 max-w-[20rem] truncate text-[0.75rem]"
        style={{ color: "var(--text-faint)" }}
        title={message}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="dm-eyebrow mt-7 rounded-full border px-5 py-2.5 transition-colors"
        style={{ borderColor: "var(--line-strong)", color: "var(--text)" }}
      >
        Try again
      </button>
    </section>
  </main>
);
