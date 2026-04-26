import { App, ExpressReceiver } from "@slack/bolt";
import type { Logger } from "./logger";

export interface CreateBoltAppOptions {
  signingSecret: string;
  botToken: string;
  registerRoutes: (app: App) => void;
  logger?: Logger;
  processBeforeResponse?: boolean;
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

  const app = new App({
    token: options.botToken,
    receiver,
  });

  options.registerRoutes(app);

  if (options.logger) {
    app.error(async (error) => {
      options.logger!.error("Bolt app error", { error: String(error) });
    });
  }

  return { app, receiver };
}
