import { useRef, useState } from "react";
import { LockClosed, LockOpen } from "./icons";

/**
 * Knob travel in px. Must match the `translateX(144px)` on
 * `.dm-switch[data-on="true"] .dm-switch-knob` in index.css. If the track or knob
 * size changes there, change this too.
 */
const TRAVEL = 144;
/** Pointer movement under this many px counts as a tap, not a drag. */
const TAP_THRESHOLD = 4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

type ToggleProps = {
  /** true = auto-unlock on, false = off, null = state not yet known. */
  checked: boolean | null;
  disabled?: boolean;
  onChange: (next: boolean) => void;
};

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  disabled,
  onChange,
}) => {
  const on = checked === true;
  const indeterminate = checked === null;
  // No dragging while the state is unknown or the control is disabled.
  const locked = Boolean(disabled) || indeterminate;

  // Live knob offset while dragging, or null when at rest (CSS owns position).
  const [dragX, setDragX] = useState<number | null>(null);
  const startX = useRef(0);
  const startOffset = useRef(0);
  // Whether this gesture moved past the tap threshold (so it is a drag).
  const moved = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    startX.current = e.clientX;
    startOffset.current = on ? TRAVEL : 0;
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragX(startOffset.current);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragX === null) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > TAP_THRESHOLD) moved.current = true;
    setDragX(clamp(startOffset.current + delta, 0, TRAVEL));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragX === null) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // Commit only on a real drag, and only when it crosses to the other side.
    if (moved.current) {
      const next = dragX > TRAVEL / 2;
      if (next !== on) onChange(next);
    }
    setDragX(null);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    moved.current = false;
    setDragX(null);
  };

  const handleClick = () => {
    // A real drag still fires a synthetic click on release. Swallow it; the drag
    // already decided the state. A plain tap (no drag) toggles as before, which
    // also covers keyboard activation (Enter / Space).
    if (moved.current) {
      moved.current = false;
      return;
    }
    onChange(!on);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={indeterminate ? "mixed" : on}
      aria-label="Automatic unlocking"
      disabled={locked}
      onClick={handleClick}
      data-on={on}
      data-indeterminate={indeterminate}
      className="dm-switch"
    >
      <span className="dm-switch-track">
        <LockClosed className="dm-switch-ghost dm-switch-ghost-left" />
        <LockOpen className="dm-switch-ghost dm-switch-ghost-right" />
        <span
          className="dm-switch-knob"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={
            dragX === null
              ? undefined
              : { transform: `translateX(${dragX}px)`, transition: "none" }
          }
        >
          <LockClosed className="dm-knob-icon dm-knob-icon-lock" />
          <LockOpen className="dm-knob-icon dm-knob-icon-unlock" />
        </span>
      </span>
    </button>
  );
};
