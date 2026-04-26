export interface SlackBotKitEnv {
  signingSecret: string;
  botToken: string;
  logChannel: string | undefined;
}

export class MissingEnvError extends Error {
  constructor(public readonly missing: readonly string[]) {
    super(
      `SlackBotKit: missing required environment variables: ${missing.join(", ")}. ` +
        `See .env.example for the full list.`,
    );
    this.name = "MissingEnvError";
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): SlackBotKitEnv {
  const signingSecret = source["SLACK_SIGNING_SECRET"];
  const botToken = source["SLACK_BOT_TOKEN"];

  const missing: string[] = [];
  if (!signingSecret) missing.push("SLACK_SIGNING_SECRET");
  if (!botToken) missing.push("SLACK_BOT_TOKEN");
  if (missing.length > 0) throw new MissingEnvError(missing);

  return {
    signingSecret: signingSecret as string,
    botToken: botToken as string,
    logChannel: source["SLACK_LOG_CHANNEL"] || undefined,
  };
}
