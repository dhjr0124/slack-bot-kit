# SlackBotKit

[![CI](https://github.com/dhjr0124/slack-bot-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/dhjr0124/slack-bot-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](#requirements)

> Conventions and platform adapters for building Slack bots on serverless platforms — Netlify, Vercel, AWS Lambda, and Express — on top of [`@slack/bolt`](https://github.com/slackapi/bolt-js).

## Why this exists

Bolt already supports multiple receivers. SlackBotKit is **the conventions on top**:

- **One config object, four target platforms.** Swap `createNetlifyHandler` ↔ `createVercelHandler` ↔ `createLambdaHandler` ↔ `createExpressApp` without rewriting your handlers.
- **Pluggable auth strategies** for wrapping a third-party REST API behind your bot (token-with-refresh and HTTP Basic out of the box; `AuthStrategy` interface for everything else).
- **Validated env loading** that fails fast at boot rather than 500-ing on the first request.
- **View composition helpers** for assembling Block Kit modals out of reusable fragments (`composeBlocks`, `extendView`, widget primitives).
- **Pluggable token cache** so multi-instance deployments can share state via Redis / DynamoDB / Vercel KV without the kit owning those integrations.

## What this is *not*

- A replacement for Bolt. You write the same `app.message(...)` / `app.action(...)` / `app.event(...)` handlers; SlackBotKit just wires them up.
- A Cloudflare Workers solution. Workers need a Web-Fetch-API rewrite that's not in scope for v0.1. Use Bolt's community Workers receiver if that's your target.
- A managed product. There is no hosted version and no roadmap to ship one.

## Install

```bash
npm install slack-bot-kit @slack/bolt
```

Requires Node ≥ 20.

## Quickstart

```ts
// netlify/functions/slack.ts
import { createNetlifyHandler, loadEnv, composeRoutes } from "slack-bot-kit";

const env = loadEnv(); // throws fast if SLACK_SIGNING_SECRET / SLACK_BOT_TOKEN missing

export const handler = createNetlifyHandler({
  signingSecret: env.signingSecret,
  botToken: env.botToken,
  registerRoutes: composeRoutes(
    (app) => app.message("hello", async ({ say }) => say("👋")),
    (app) => app.event("app_home_opened", async ({ client, payload }) => {
      await client.views.publish({
        user_id: payload.user,
        view: { type: "home", blocks: [/* ... */] },
      });
    }),
  ),
});
```

The same `registerRoutes` works on Vercel:

```ts
// api/slack.ts
import { createVercelHandler, loadEnv } from "slack-bot-kit";
import { routes } from "../routes";

const env = loadEnv();
export default createVercelHandler({ ...env, registerRoutes: routes });
```

…on raw Lambda:

```ts
import { createLambdaHandler, loadEnv } from "slack-bot-kit";
import { routes } from "./routes";

const env = loadEnv();
export const handler = createLambdaHandler({ ...env, registerRoutes: routes });
```

…and on Express:

```ts
import express from "express";
import { createExpressApp, loadEnv } from "slack-bot-kit";
import { routes } from "./routes";

const env = loadEnv();
const slack = createExpressApp({ ...env, registerRoutes: routes });
const app = express();
app.use(slack.router);
app.listen(3000);
```

## Worked example

See [`examples/echo-bot`](examples/echo-bot/) for a deployable Netlify echo bot that:

- Responds to a `/echo` slash command
- Renders an interactive home tab
- Demonstrates the form-field extraction and view-composition helpers

## Auth strategies

Wrap a third-party API behind your bot. Two strategies ship; implement `AuthStrategy` for anything else.

```ts
import { TokenAuthStrategy, BasicAuthStrategy } from "slack-bot-kit";

const auth = new TokenAuthStrategy({
  cacheKey: "github",
  headerName: "Authorization",
  headerPrefix: "Bearer ",
  fetchToken: async () => {
    const res = await fetch("https://auth.example.com/token", { method: "POST", body: "..." });
    const { access_token, expires_in } = await res.json();
    return { value: access_token, expiresAt: Date.now() + expires_in * 1000 };
  },
});

// In a handler:
const headers: Record<string, string> = { "Content-Type": "application/json" };
await auth.applyTo(headers);
await fetch("https://api.example.com/things", { headers });
```

The token cache is in-memory by default. To share across instances, plug in your own:

```ts
import type { TokenCache } from "slack-bot-kit";

const redisCache: TokenCache = {
  get: async (k) => {
    const raw = await redis.get(`tok:${k}`);
    return raw ? JSON.parse(raw) : undefined;
  },
  set: async (k, t) => { await redis.set(`tok:${k}`, JSON.stringify(t)); },
  delete: async (k) => { await redis.del(`tok:${k}`); },
};
```

## View composition

```ts
import { composeBlocks, extendView, Button, Input, StaticSelect } from "slack-bot-kit";

const helpHeader = [{ type: "header", text: { type: "plain_text", text: "Help" } }];
const actions = [
  Button({ text: "Refresh", actionId: "refresh-action", style: "primary" }),
];

const home = {
  type: "home" as const,
  blocks: composeBlocks(helpHeader, [{ type: "actions", elements: actions }]),
};
```

## Testing

```bash
npm test              # vitest run
npm run test:watch    # vitest watch
npm run test:coverage # v8 coverage with thresholds
```

Coverage thresholds (lines / functions / statements ≥ 80%, branches ≥ 75%) are enforced in `vitest.config.ts`.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the design rationale: why adapters, why a strategy interface, what was rejected and why.

## Origin & credits

Originally derived from [Clyde D'Souza's MIT-licensed Slack-bolt-on-Netlify scaffold](https://github.com/) (2021), substantially rewritten and extended. See [NOTICE.md](NOTICE.md) for the diff in scope and design.
