import type { ReceiverEvent, SlackAction } from "@slack/bolt";
import type { View } from "@slack/types";
import type { WebClient } from "@slack/web-api";
import type { Logger } from "./core/logger";
import type { SlackMessageReply, SlackPrivateReply, SlackReactionReply } from "./constants";

/**
 * Parse a Slack request body. Slack sends JSON for events and
 * `application/x-www-form-urlencoded` (sometimes wrapping a JSON `payload`
 * field) for interactive actions and slash commands.
 *
 * Returns `undefined` if the body is empty/null. Throws on malformed input
 * — callers should treat a thrown error as a 400 Bad Request.
 */
export function parseRequestBody(
  rawBody: string | null | undefined,
  contentType: string | undefined,
): unknown {
  if (rawBody == null || rawBody === "") return undefined;

  const ct = (contentType ?? "").toLowerCase();

  if (ct.includes("application/json")) {
    return JSON.parse(rawBody);
  }

  // URL-encoded. URLSearchParams handles `=` inside values correctly,
  // unlike the naive split("=") approach.
  const params = new URLSearchParams(rawBody);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  if (typeof result["payload"] === "string") {
    return JSON.parse(result["payload"]);
  }
  return result;
}

export function generateReceiverEvent(payload: unknown): ReceiverEvent {
  return {
    body: payload as Record<string, unknown>,
    ack: async (_response?: unknown): Promise<void> => {
      // Bolt's AckFn returns void; the surrounding adapter constructs the
      // platform response itself. We swallow whatever the handler passes.
    },
  };
}

export function isUrlVerificationRequest(
  payload: unknown,
): payload is { type: "url_verification"; challenge: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "type" in payload &&
    (payload as { type: unknown }).type === "url_verification" &&
    "challenge" in payload &&
    typeof (payload as { challenge: unknown }).challenge === "string"
  );
}

export async function replyMessage(packet: SlackMessageReply, logger?: Logger): Promise<void> {
  try {
    await packet.app.client.chat.postMessage({
      token: packet.botToken,
      channel: packet.channelId,
      thread_ts: packet.threadTimestamp,
      text: packet.message,
    });
  } catch (error) {
    logger?.error("replyMessage failed", { error: String(error) });
    throw error;
  }
}

export async function replyReaction(packet: SlackReactionReply, logger?: Logger): Promise<void> {
  try {
    await packet.app.client.reactions.add({
      token: packet.botToken,
      name: packet.reaction,
      channel: packet.channelId,
      timestamp: packet.threadTimestamp,
    });
  } catch (error) {
    logger?.error("replyReaction failed", { error: String(error) });
    throw error;
  }
}

export async function replyPrivateMessage(
  packet: SlackPrivateReply,
  logger?: Logger,
): Promise<void> {
  try {
    await packet.app.client.chat.postEphemeral({
      token: packet.botToken,
      channel: packet.channelId,
      text: packet.message,
      user: packet.userId,
    });
  } catch (error) {
    logger?.error("replyPrivateMessage failed", { error: String(error) });
    throw error;
  }
}

export async function updateOrPublishView(
  client: WebClient,
  body: SlackAction,
  view: View,
  logger?: Logger,
): Promise<void> {
  const anyBody = body as unknown as {
    view?: { id?: string };
    container?: { view_id?: string };
  };
  const viewId = anyBody.view?.id ?? anyBody.container?.view_id;
  const userId = body.user.id;

  try {
    if (viewId) {
      await client.views.update({ view_id: viewId, view });
    } else if (userId) {
      await client.views.publish({ user_id: userId, view });
    }
  } catch (error) {
    logger?.error("updateOrPublishView failed", { error: String(error) });
    throw error;
  }
}

export async function sendMessageToLogChannel(
  message: string,
  client: WebClient,
  channelName: string,
  logger?: Logger,
): Promise<void> {
  try {
    const channels = await client.conversations.list({
      types: "public_channel,private_channel",
    });
    const target = channels.channels?.find(
      (ch) => typeof ch.name === "string" && ch.name.toLowerCase() === channelName.toLowerCase(),
    );
    if (!target?.id) {
      logger?.warn("Log channel not found", { channelName });
      return;
    }
    await client.chat.postMessage({
      channel: target.id,
      text: `${new Date().toISOString()}: ${message}`,
      parse: "none",
    });
  } catch (error) {
    logger?.error("sendMessageToLogChannel failed", { error: String(error) });
  }
}

export function getFormField(
  body: unknown,
  field: string,
): string | undefined {
  const values = (body as { view?: { state?: { values?: Record<string, unknown> } } })?.view?.state
    ?.values;
  if (!values) return undefined;
  const block = values[field] as Record<string, { value?: string }> | undefined;
  return block?.[`${field}-value`]?.value;
}

export interface SelectOption {
  text: { type: string; text: string; emoji: boolean };
  value: string;
}

export function getFormSelectField(body: unknown, field: string): SelectOption | undefined {
  const values = (body as { view?: { state?: { values?: Record<string, unknown> } } })?.view?.state
    ?.values;
  if (!values) return undefined;
  const block = values[field] as
    | Record<string, { selected_option?: SelectOption }>
    | undefined;
  return block?.[`${field}-value`]?.selected_option;
}

export function assembleUrl(event: { headers?: Record<string, string | undefined> }): string {
  if (process.env["URL"]) return process.env["URL"];
  const host = event.headers?.["host"] ?? event.headers?.["Host"];
  return host ? `https://${host}` : "";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
