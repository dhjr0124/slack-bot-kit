import { App, ExpressReceiver, type Authorize } from "@slack/bolt";
import type { Logger } from "./logger";

export interface CreateBoltAppOptions {
  signingSecret: string;
  botToken: string;
  registerRoutes: (app: App) => void;
  logger?: Logger;
  processBeforeResponse?: boolean;
  /**
   * Override Bolt's default authorization. Useful for multi-workspace OAuth
   * apps that resolve credentials per-team, and for tests that want to skip
   * the `auth.test` round trip Bolt makes on first event in single-tenant mode.
   *
   * When omitted, Bolt uses `botToken` and looks up `botId`/`botUserId` via
   * `auth.test` on first event.
   */
  authorize?: Authorize<boolean>;
}

export interface BoltAppHandle {
  app: App;
  receiver: ExpressReceiver;
}

export function createBoltApp(options: CreateBoltAppOptions): BoltAppHandle {
  const receiver = new ExpressReceiver({
    signingSecret: options.signingSecret,
    processBeforeResponse: options.processBeforeResponse ?? true,
  });

  const app = options.authorize
    ? new App({ receiver, authorize: options.authorize })
    : new App({ receiver, token: options.botToken });

  options.registerRoutes(app);

  if (options.logger) {
    app.error(async (error) => {
      options.logger!.error("Bolt app error", { error: String(error) });
    });
  }

  return { app, receiver };
}
