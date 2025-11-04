import twilio from "twilio";

export async function sendText(
    to: string,
    body: string
) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !from) {
        throw new Error(
            "Twilio credentials are missing. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables."
        );
    }

    const client = twilio(accountSid, authToken);

    return client.messages.create({
        body,
        from,
        to,
    });
}
