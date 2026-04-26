import type { App } from "@slack/bolt";

interface BaseSlackReply {
  app: App;
  botToken: string | undefined;
  channelId: string;
  threadTimestamp: string;
}

export interface SlackReactionReply extends BaseSlackReply {
  reaction: string;
}

export interface SlackMessageReply extends BaseSlackReply {
  message: string;
}

export interface SlackPrivateReply extends Omit<SlackMessageReply, "threadTimestamp"> {
  userId: string;
}

export interface HandlerResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}
