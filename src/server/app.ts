import { Hono } from "hono";
import twilio from "twilio";
import { ZodError } from "zod";
import {
  DOOR_UNLOCK_DELAY_SECONDS,
  DOOR_UNLOCK_DIGIT,
  HANGUP_DELAY_SECONDS,
  UNAVAILABLE_MESSAGE,
  TIMES_TO_EMIT_UNLOCK_DIGIT,
} from "../consts.js";
import { DoorUpdateSchema } from "../schemas/door.js";
import { DoorStore } from "../stores/door.js";

// Parse comma-separated phone numbers from environment variables.
const getPhoneNumberList = (str?: string): string[] => {
  if (!str) return [];
  return str
    .split(",")
    .map((num) => num.trim())
    .filter((num) => num.length);
};

const whiteListedPhoneNumbers = getPhoneNumberList(process.env.WHITE_LISTED_PHONE_NUMBERS);
const blackListedPhoneNumbers = getPhoneNumberList(process.env.BLACK_LISTED_PHONE_NUMBERS);

const xml = (twiml: twilio.twiml.VoiceResponse) =>
  new Response(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });

const rejected = async () => {
  const twiml = new twilio.twiml.VoiceResponse();
  await DoorStore.update({ lastRejectedAt: new Date().toISOString() });
  if (UNAVAILABLE_MESSAGE) twiml.say(UNAVAILABLE_MESSAGE);
  return xml(twiml);
};

const app = new Hono();

app.post("/api/answer", async (c) => {
  const door = await DoorStore.get();
  const twiml = new twilio.twiml.VoiceResponse();
  const digits = DOOR_UNLOCK_DIGIT.toString().repeat(TIMES_TO_EMIT_UNLOCK_DIGIT || 1);

  await DoorStore.update({ lastAnsweredAt: new Date().toISOString() });

  // Get caller's phone number from the Twilio request.
  const formData = await c.req.formData();
  const callerPhoneNumber = formData.get("From") as string | null;

  // Check if caller is blacklisted
  if (callerPhoneNumber && blackListedPhoneNumbers.includes(callerPhoneNumber)) {
    return rejected();
  }

  // Check if whitelist is enforced and caller is not whitelisted
  if (
    callerPhoneNumber &&
    whiteListedPhoneNumbers.length &&
    !whiteListedPhoneNumbers.includes(callerPhoneNumber)
  ) {
    return rejected();
  }

  // Check if automatic unlocking is enabled
  if (!door.isUnlockAllowed) {
    return rejected();
  }

  await DoorStore.update({ lastUnlockedAt: new Date().toISOString() });

  if (DOOR_UNLOCK_DELAY_SECONDS) twiml.pause({ length: DOOR_UNLOCK_DELAY_SECONDS });
  twiml.play({ digits });
  if (HANGUP_DELAY_SECONDS) twiml.pause({ length: HANGUP_DELAY_SECONDS });

  return xml(twiml);
});

app.get("/api/door", async (c) => {
  const door = await DoorStore.get();
  return c.json(door);
});

app.patch("/api/door", async (c) => {
  try {
    const patch = DoorUpdateSchema.parse(await c.req.json());
    const updated = await DoorStore.update(patch);
    return c.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      return c.json({ error: err.issues }, 400);
    }
    throw err;
  }
});

app.delete("/api/door", async (c) => {
  await DoorStore.delete();
  return c.body(null, 204);
});

export default app;
