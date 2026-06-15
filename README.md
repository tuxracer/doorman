# Doorman 🔓📞

**Doorman** is an automated door unlock system for residents using a callbox. When someone presses your code at the callbox, it places a phone call. Normally, you answer and press a digit to unlock the door. Doorman automates this by answering the call and pressing the unlock digit when auto-unlock is enabled.

Perfect for deliveries 📦 or letting in guests without needing to pick up the phone. Toggle auto-unlock on or off through a simple web interface.

> ⚠️ **Note**: You must ask your property manager to configure the callbox to call your Twilio number instead of your personal phone.

---

## Features

- 🔑 Automatic door unlocking using DTMF tones
- 🌐 Web interface to enable or disable unlocking
- 📊 Activity tracking for unlocks, calls, and rejections
- 🛠️ Customizable behavior and timing

---

## How It Works

1. Your callbox is set up to call your Twilio number
2. Twilio forwards incoming calls to your `/api/answer` endpoint
3. Doorman auto-answers the call
4. If unlocking is enabled:
   - It waits a few seconds
   - Sends the unlock digit (e.g. `9`)
   - Hangs up after a short delay
5. _(Planned, not yet implemented)_ Optionally sends you an SMS notification
6. If unlocking is disabled, the caller hears an "unavailable" message

---

## Callbox Setup

1. 📞 **Get a Twilio number** from [twilio.com](https://twilio.com)
2. 🏢 **Contact your property manager** and give them your Twilio number
3. ✅ **Verify** the callbox is calling your Twilio number correctly
4. 🧪 **Test** the setup by pressing your code at the callbox

> ℹ️ Some properties may charge fees or have restrictions on callbox number changes. Ask your management team for details.

---

## Getting Started

### Prerequisites

- Node.js and [pnpm](https://pnpm.io) (this project is pinned to pnpm via `packageManager`)
- A Twilio account with a phone number
- A Supabase project
- Required environment variables

### Install Dependencies

```bash
pnpm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_supabase_secret_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
NOTIFY_PHONE_NUMBER=+1234567890
WHITE_LISTED_PHONE_NUMBERS=+1234567890,+0987654321
BLACK_LISTED_PHONE_NUMBERS=+1111111111,+2222222222
```

**Optional Variables:**

- `NOTIFY_PHONE_NUMBER`: Phone number to notify by SMS when the door is unlocked (e.g., `+1234567890`)
- `WHITE_LISTED_PHONE_NUMBERS`: Comma-separated list of phone numbers allowed to unlock (e.g., `+1234567890,+0987654321`)
- `BLACK_LISTED_PHONE_NUMBERS`: Comma-separated list of phone numbers blocked from unlocking (e.g., `+1111111111,+2222222222`)

> ℹ️ **Implementation note:** The app currently uses Twilio only to generate TwiML
> for the voice webhook, which needs **no credentials**. `TWILIO_ACCOUNT_SID`,
> `TWILIO_AUTH_TOKEN`, `NOTIFY_PHONE_NUMBER`, and the SMS notification are documented
> for the planned feature but are **not yet wired into the code**. Only `SUPABASE_URL`,
> `SUPABASE_SECRET_KEY`, and the phone-list variables are read today.

---

## Configuration ⚙️

Edit `src/consts.ts` to customize behavior:

- `DOOR_UNLOCK_DIGIT`: DTMF digit to send (e.g. `9`)
- `TIMES_TO_EMIT_UNLOCK_DIGIT`: Number of times to send it (default is `2`)
- `DOOR_UNLOCK_DELAY_SECONDS`: Delay before unlocking (default is `3` seconds)
- `HANGUP_DELAY_SECONDS`: Delay before hanging up (default is `3` seconds)
- `UNAVAILABLE_MESSAGE`: Message played when auto-unlock is disabled

---

## Run the Development Server 🚧

```bash
pnpm dev
```

Open your browser at [http://localhost:5173](http://localhost:5173) to view the control panel.

---

## Twilio Setup 🔁

In your Twilio console:

1. Go to your Twilio phone number settings
2. Set the voice webhook URL to:

```
https://your-domain.com/api/answer
```

3. Set the HTTP method to `POST`

---

## Usage

1. ✅ Make sure your Twilio number is configured on the callbox
2. 🕹️ Use the web interface to enable auto-unlocking when needed
3. When a visitor arrives:
   - Callbox calls your Twilio number
   - Doorman answers automatically
   - If enabled, it sends unlock tones and optionally notifies you via SMS
   - If disabled, the caller hears an "unavailable" message
4. 🔒 Disable auto-unlock when you're done

The interface shows:

- Current unlock status
- Last unlock time
- Last answered call
- Last rejected attempt

---

## Tech Stack

- **Vite**: SPA build and dev server
- **Hono**: API routes, run as a portable Node server
- **Twilio**: Call handling and DTMF control
- **Supabase**: State storage
- **SWR**: Data fetching and caching

---

## Deploy 🚀

### On Vercel

Vercel serves the built SPA as static files and runs the `/api` routes as Functions.
`api/door.ts` and `api/answer.ts` wrap the same Hono app, so no extra config is needed:
deploy the repo and set the environment variables from the section above in the project
settings. The Twilio webhook URL stays `https://your-domain.com/api/answer`.

### Anywhere else (portable Node server)

Doorman also builds to a single Node server you can run anywhere Node runs (a VPS,
Docker, Fly, Render, Railway):

```bash
pnpm build
pnpm start
```

`pnpm start` serves the built UI and the `/api` routes on one port (default `3000`,
override with `PORT`). Set the environment variables on your host and point the Twilio
voice webhook at `https://your-domain.com/api/answer`.

---

Enjoy door access control with Doorman 🛎️
