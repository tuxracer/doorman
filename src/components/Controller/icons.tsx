type IconProps = { className?: string };

/** Closed padlock: shackle seated into the body. */
export const LockClosed = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M8 11V7.5a4 4 0 0 1 8 0V11"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <rect
      x="5.25"
      y="11"
      width="13.5"
      height="9.5"
      rx="2.4"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <circle cx="12" cy="15.4" r="1.2" fill="currentColor" />
    <path
      d="M12 16.4v2"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

/** Open padlock: shackle swung clear of the body. */
export const LockOpen = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M8 11V7.5a4 4 0 0 1 7.7-1.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <rect
      x="5.25"
      y="11"
      width="13.5"
      height="9.5"
      rx="2.4"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <circle cx="12" cy="15.4" r="1.2" fill="currentColor" />
    <path
      d="M12 16.4v2"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

/** Wordmark glyph: a key, for the doorman. */
export const KeyIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M10.4 10.4 19 19"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path
      d="M16.2 16.2l1.8-1.8M14 14l1.4-1.4"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

/** Wifi waves struck through: no connection. */
export const WifiOffIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <circle cx="12" cy="19" r="1.2" fill="currentColor" />
    <path
      d="M3 3 21 21"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);
