import { LockClosed, LockOpen } from "./icons";

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

  return (
    <button
      type="button"
      role="switch"
      aria-checked={indeterminate ? "mixed" : on}
      aria-label="Automatic unlocking"
      disabled={disabled || indeterminate}
      onClick={() => onChange(!on)}
      data-on={on}
      data-indeterminate={indeterminate}
      className="dm-switch"
    >
      <span className="dm-switch-track">
        <LockClosed className="dm-switch-ghost dm-switch-ghost-left" />
        <LockOpen className="dm-switch-ghost dm-switch-ghost-right" />
        <span className="dm-switch-knob">
          <LockClosed className="dm-knob-icon dm-knob-icon-lock" />
          <LockOpen className="dm-knob-icon dm-knob-icon-unlock" />
        </span>
      </span>
    </button>
  );
};
