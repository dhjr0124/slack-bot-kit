# Notice

SlackBotKit is derived from work originally published by Clyde D'Souza under the MIT license in 2021. The original repository provided a Netlify-Functions Slack bot scaffold using `@slack/bolt` with `ExpressReceiver`.

This project has been substantially rewritten and extended:

- Multi-platform handler adapters (Netlify, Vercel, AWS Lambda, Express) replacing single-target Netlify wiring
- Pluggable auth-strategy interface for wrapping third-party REST APIs
- Pluggable logger and token-cache interfaces
- Strict TypeScript with zero `any`-cast escape hatches
- Validated environment loading with fail-fast diagnostics
- `parseRequestBody` rewritten on top of `URLSearchParams` (fixes a bug in the original where values containing `=` were silently truncated)
- `vitest`-based test suite
- Bolt 4.x baseline

The MIT permission notice and original copyright are preserved in `LICENSE` per MIT terms.
