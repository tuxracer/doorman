/** Number to press to open the door */
export const DOOR_UNLOCK_DIGIT: number = 9;

/** Number of times to emit the door unlock digit */
export const TIMES_TO_EMIT_UNLOCK_DIGIT: number | undefined = 2;

/** Delay in seconds before the door is unlocked */
export const DOOR_UNLOCK_DELAY_SECONDS: number | undefined = 3;

/** Delay in seconds before the call is hung up */
export const HANGUP_DELAY_SECONDS: number | undefined = 3;

/** Message to play when the door unlock is disabled */
export const UNAVAILABLE_MESSAGE: string | undefined = "Unavailable. Please try again later.";

/** SMS message to send when the door is unlocked */
export const UNLOCK_NOTIFICATION_MESSAGE: string | undefined = "The door has been unlocked 🔓";

/** Refresh interval in milliseconds for the door status */
export const DOOR_STATUS_REFRESH_INTERVAL_MS: number | undefined = 30_000;
