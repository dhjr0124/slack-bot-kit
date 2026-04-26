import { createNetlifyHandler, loadEnv } from "slack-bot-kit";
import { routes } from "../routes";

const env = loadEnv();

export const handler = createNetlifyHandler({
  signingSecret: env.signingSecret,
  botToken: env.botToken,
  registerRoutes: routes,
});
