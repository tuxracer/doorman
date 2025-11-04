import { DOOR_UNLOCK_DELAY_SECONDS, DOOR_UNLOCK_DIGIT, HANGUP_DELAY_SECONDS, UNAVAILABLE_MESSAGE, UNLOCK_NOTIFICATION_MESSAGE, TIMES_TO_EMIT_UNLOCK_DIGIT } from "@/consts";
import { DoorStore } from "@/stores/door";
import { sendText } from "@/utils";
import { NextResponse } from "next/server";
import twilio from "twilio";

const notifyPhoneNumber = process.env.NOTIFY_PHONE_NUMBER;

// Parse comma-separated phone numbers from environment variables
const getPhoneNumberList = (str?: string): string[] => {
    if (!str) return [];
    return str.split(",").map(num => num.trim()).filter(num => num.length);
};

const whiteListedPhoneNumbers = getPhoneNumberList(process.env.WHITE_LISTED_PHONE_NUMBERS);
const blackListedPhoneNumbers = getPhoneNumberList(process.env.BLACK_LISTED_PHONE_NUMBERS);

const sendResponse = (twiml: twilio.twiml.VoiceResponse) => {
    return new NextResponse(twiml.toString(), { status: 200, headers: { "Content-Type": "text/xml" } });
};

const handleRejected = async () => {
    const twiml = new twilio.twiml.VoiceResponse();
    await DoorStore.update({ lastRejectedAt: Date.now() });
    if (UNAVAILABLE_MESSAGE) twiml.say(UNAVAILABLE_MESSAGE);
    return sendResponse(twiml);
};

export async function POST(request: Request) {
    const door = await DoorStore.get();
    const twiml = new twilio.twiml.VoiceResponse();
    const digits = DOOR_UNLOCK_DIGIT.toString().repeat(TIMES_TO_EMIT_UNLOCK_DIGIT || 1);

    await DoorStore.update({ lastAnsweredAt: Date.now() });

    // Get caller's phone number from Twilio request
    const formData = await request.formData();
    const callerPhoneNumber = formData.get("From") as string | null;

    // Check if caller is blacklisted
    if (callerPhoneNumber && blackListedPhoneNumbers.includes(callerPhoneNumber)) {
        return handleRejected();
    }

    // Check if whitelist is enforced and caller is not whitelisted
    if (callerPhoneNumber && whiteListedPhoneNumbers.length && !whiteListedPhoneNumbers.includes(callerPhoneNumber)) {
        return handleRejected();
    }

    // Check if automatic unlocking is enabled
    if (!door.isUnlockAllowed) {
        return handleRejected();
    }

    // Send notification if enabled
    if (notifyPhoneNumber && UNLOCK_NOTIFICATION_MESSAGE) {
        await sendText(notifyPhoneNumber, UNLOCK_NOTIFICATION_MESSAGE);
    }

    await DoorStore.update({ lastUnlockedAt: Date.now() });

    if (DOOR_UNLOCK_DELAY_SECONDS) twiml.pause({ length: DOOR_UNLOCK_DELAY_SECONDS });
    twiml.play({ digits });
    if (HANGUP_DELAY_SECONDS) twiml.pause({ length: HANGUP_DELAY_SECONDS });

    return sendResponse(twiml);
}
