import type { CreateBoltAppOptions } from "../core/app";
import { buildAdapterDependencies } from "./shared";

/**
 * Express-style middleware/router exposing the underlying Bolt
 * ExpressReceiver router directly. Slack's Bolt already implements
 * signature verification inside `receiver.router`, so for Express deployments
 * we hand the router straight back to the user — no shim needed.
 *
 * Mount it at the root or under any prefix you choose:
 *
 * ```ts
 * import express from "express";
 * import { createExpressApp } from "slack-bot-kit";
 *
 * const slack = createExpressApp({ ... });
 * const app = express();
 * app.use(slack.router);
 * app.listen(3000);
 * ```
 *
 * Default route exposed by Bolt's ExpressReceiver: `POST /slack/events`.
 */
export function createExpressApp(options: CreateBoltAppOptions): {
  router: import("express").Application;
  start: (port: number) => Promise<void>;
} {
  const deps = buildAdapterDependencies(options);
  return {
    router: deps.handle.receiver.router,
    start: async (port: number) => {
      await deps.handle.app.start(port);
    },
  };
}
