# Architecture

This document explains *why* SlackBotKit is shaped the way it is. The README covers *what* and *how*; this is the design rationale and the alternatives that were rejected.

## Goals

1. **Write a Slack bot once, deploy to multiple serverless platforms** with a one-line change at the entry point.
2. **Encode the conventions that matter** (env validation, error logging, view composition, auth strategies) so that *not* having them isn't an accident waiting to happen.
3. **Stay out of Bolt's way.** Users still write `app.message()`, `app.action()`, `app.event()` exactly as Bolt documents.

## Non-goals

- Edge runtime support (Cloudflare Workers, Deno Deploy). These need a Web-Fetch-API rewrite. Deferred.
- Replacing Bolt. The kit is a thin layer.
- Hosting. There is no managed component.
- Cross-platform body parsing in adversarial cases (binary uploads, multipart forms, oversized streams). Slack itself never sends those.

## Layout

```
src/
├── core/        # env loader, logger, Bolt App factory
├── adapters/    # platform-specific entry-point factories
├── auth/        # AuthStrategy interface + reference implementations
├── views/       # Block Kit composition helpers + widget primitives
├── router/      # composeRoutes() — multi-registrar fan-in
├── utils.ts     # request parsing, Slack reply helpers, form extraction
├── constants.ts # shared interface declarations
└── index.ts     # public API barrel
```

Each module has an `index.ts` barrel and is independently importable. The public API is what `src/index.ts` re-exports.

## Key decisions

### 1. Adapter factories, not a "framework runtime"

Each adapter (`createNetlifyHandler`, `createVercelHandler`, `createLambdaHandler`, `createExpressApp`) is a ~30-line factory that:

1. Builds a Bolt App once (at module load)
2. Wraps it in a platform-shaped handler

**Rejected:** a unifying "runtime" abstraction that papers over platform differences. That direction leads to reinventing `serverless-http` or SST, badly. The current approach trades off some duplication for a clear mental model: each adapter is a single file, and the only shared logic is `processRequest()` in `adapters/shared.ts`.

**Why factories and not a class?** Bolt's `App` is itself a class with an inherently mutable lifecycle. Wrapping it in another class would force users to learn two object models. A factory returns a plain function — the simplest thing that works.

### 2. `processBeforeResponse: true` by default

Slack expects a 200 within 3 seconds. On Lambda, the function instance is paused after the response is sent, so deferred work won't run. `processBeforeResponse: true` makes Bolt invoke handlers synchronously before responding. This is the right default for serverless; users running Express can override it.

**Rejected:** a "fire-and-forget" pattern that returns 200 immediately and processes the event in a background promise. The original code we forked did this via a self-fetch pattern (one function calls another). It works but doubles the cold-start surface and adds a moving part. Better to use a queue (SQS / Inngest) when fire-and-forget is genuinely needed.

### 3. `AuthStrategy` interface with two reference implementations

The interface is small (one method, `applyTo(headers)`) because the original problem was small (set a header). Two references — `TokenAuthStrategy` and `BasicAuthStrategy` — cover the cases we actually have evidence for.

**Rejected:** a richer interface with `applyToRequest(req)` semantics, OAuth2 flows built in, refresh-token endpoints, etc. That direction is speculative until a third use case shows up. The current shape is easy to extend without breaking existing implementers.

**`TokenCache` as a separate interface** is the abstraction that pays off across all token-style strategies — it's where multi-instance deployments diverge from single-instance ones. The default `MemoryTokenCache` is fine for Lambda warm-pool sharing within a region; production deployments running across replicas should plug Redis / DynamoDB / Vercel KV.

### 4. Validated env loading

`loadEnv()` returns a typed `SlackBotKitEnv` and throws `MissingEnvError` listing every missing variable at once. Two reasons:

1. **Fail fast at boot, not at first request.** A 500 on the first event makes diagnosis annoying; an exception on `import` is obvious.
2. **One pass, all errors.** Reporting one missing var at a time forces a debug-deploy loop. Listing them all means one fix.

**Rejected:** Zod / Valibot. The validation surface is two strings; pulling in a 30-50KB schema lib is overkill. Hand-rolled stays at 25 lines and zero deps.

### 5. Pluggable `Logger` interface

The kit logs in three places: receiver-level errors (via `app.error`), parser failures (in adapters), and helper-failure paths (`replyMessage`, etc). Each takes an optional `Logger`. The default is a structured-JSON console logger; users can swap pino, winston, OTEL, etc.

**Rejected:** silent `console.error(error)` in catch blocks (the original pattern). It looks safe but means production failures are invisible — no alerting, no aggregation, no correlation. The kit threads a logger explicitly so observability is opt-out, not opt-in.

### 6. `parseRequestBody` rewritten on `URLSearchParams`

The original implementation `pair.split("=")` broke on values containing `=` (Slack's signed payloads contain Base64 values that often end in `==`). The bug was masked because the surrounding `try { } catch { return "" }` swallowed errors and Slack retried.

The fix uses `URLSearchParams`, which handles `=` correctly. Failures throw rather than swallow — adapters map a thrown parse error to HTTP 400.

### 7. `composeRoutes` instead of a routing DSL

Bolt's existing `app.message(...)` / `app.action(...)` API is fine. The only gap is composing handler registrations across multiple files. `composeRoutes((app) => ..., (app) => ...)` is enough.

**Rejected:** a declarative routing schema (`{ messages: { hello: handler }, actions: {...} }`). It would force users to learn a second API on top of Bolt's, with weaker types and no benefit.

### 8. Strict TypeScript with `noUncheckedIndexedAccess`

The original used `any` casts liberally to navigate Slack's deeply-nested payload shapes. We pay a small ergonomic cost for `noUncheckedIndexedAccess` — every index access becomes `T | undefined` — in exchange for catching real bugs at compile time. The form-extraction helpers (`getFormField`, `getFormSelectField`) absorb the awkwardness behind a typed interface so user code stays clean.

## Test strategy

- **Unit-only.** No live Slack workspace required. No network access. `npm test` runs in <2 seconds.
- **Coverage thresholds enforced** by Vitest (lines/functions/statements ≥ 80%, branches ≥ 75%).
- **Bug-prone surfaces get extra coverage:** `parseRequestBody` has a regression test for the original `split('=')` bug; `TokenAuthStrategy` uses fake timers to verify refresh-skew behavior.
- **Adapters are tested by injecting fake event objects** rather than spinning up a server. The processing pipeline runs end-to-end including Bolt App construction.

## What's ahead

Possible v0.2.0 directions, in rough priority:

1. **Cloudflare Workers adapter** — requires moving body parsing off `Buffer` and onto `Uint8Array`. Plus a cache adapter for KV.
2. **OAuth2 strategy** with refresh tokens, if a third real use case shows up.
3. **Bolt 4 → 5 migration** when 5 lands.
4. **A signature-verification standalone helper** for users who need to verify Slack signatures outside of Bolt (e.g., in a queue worker).

What's intentionally **not** on the list: configuration files, CLI scaffolding, a "create-slack-bot-kit" generator. Those are downstream concerns that don't justify the maintenance tax.
