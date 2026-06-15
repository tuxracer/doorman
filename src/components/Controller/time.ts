/** Compact, human relative time: "moments ago", "12 min ago", "yesterday". */
export function formatRelative(
  iso: string | null | undefined,
  now: number,
): string {
  if (!iso) return "No record";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "No record";

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 45) return "moments ago";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Full local timestamp, shown on hover via the title attribute. */
export function formatExact(iso: string | null | undefined): string {
  if (!iso) return "Never recorded";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Never recorded";
  return date.toLocaleString();
}
