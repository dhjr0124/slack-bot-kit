# Echo bot — SlackBotKit example

A minimal but complete Slack bot that demonstrates SlackBotKit running on Netlify Functions.

## What it does

- **`@echo-bot hello world`** in a channel → posts back `hello world`.
- **App Home tab** renders a button that opens a modal.
- **Modal submission** echoes the entered phrase back to the user as a DM.

## Run locally

```bash
cd examples/echo-bot
npm install
cp ../../.env.example .env  # then fill in SLACK_SIGNING_SECRET and SLACK_BOT_TOKEN
npm run build
npm run dev                  # netlify dev with live tunneling
```

Point your Slack app's **Event Subscriptions** and **Interactivity** request URLs at the `netlify dev --live` tunnel. The handler is mounted at `/slack/events`.

## Required Slack app config

- Event subscriptions: `app_home_opened`, `message.channels` (or `message.im`), and the `app_mentions:read` scope if you want mention-style triggers.
- Interactivity: enabled, request URL = your tunnel + `/slack/events`.
- Bot scopes: `chat:write`, `commands`, `im:write`.

## How it's wired

[`src/functions/slack.ts`](src/functions/slack.ts) is the Netlify entry point — three lines plus an env load. All routing lives in [`src/routes.ts`](src/routes.ts), composed from three registrars (events, messages, actions).

To deploy the same routes to Vercel, replace the entry-point file:

```ts
import { createVercelHandler, loadEnv } from "slack-bot-kit";
import { routes } from "../routes";
const env = loadEnv();
export default createVercelHandler({ ...env, registerRoutes: routes });
```

That's the entire diff.
