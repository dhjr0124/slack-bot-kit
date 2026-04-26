import { describe, it, expect, vi } from "vitest";
import {
  replyMessage,
  replyReaction,
  replyPrivateMessage,
  updateOrPublishView,
  sendMessageToLogChannel,
} from "../src/utils";
import type { App } from "@slack/bolt";
import type { WebClient } from "@slack/web-api";

function makeApp(overrides: Record<string, unknown> = {}) {
  return {
    client: {
      chat: {
        postMessage: vi.fn().mockResolvedValue({ ok: true }),
        postEphemeral: vi.fn().mockResolvedValue({ ok: true }),
      },
      reactions: {
        add: vi.fn().mockResolvedValue({ ok: true }),
      },
      ...overrides,
    },
  } as unknown as App;
}

describe("replyMessage", () => {
  it("forwards the canonical fields to chat.postMessage", async () => {
    const app = makeApp();
    await replyMessage({
      app,
      botToken: "xoxb-1",
      channelId: "C1",
      threadTimestamp: "1.0",
      message: "hello",
    });
    expect(app.client.chat.postMessage).toHaveBeenCalledWith({
      token: "xoxb-1",
      channel: "C1",
      thread_ts: "1.0",
      text: "hello",
    });
  });

  it("rethrows API errors and routes through the optional logger", async () => {
    const app = makeApp({
      chat: { postMessage: vi.fn().mockRejectedValue(new Error("rate_limited")) },
    });
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    await expect(
      replyMessage(
        {
          app,
          botToken: "t",
          channelId: "C",
          threadTimestamp: "0",
          message: "x",
        },
        logger,
      ),
    ).rejects.toThrow("rate_limited");
    expect(logger.error).toHaveBeenCalled();
  });
});

describe("replyReaction", () => {
  it("forwards to reactions.add with the canonical fields", async () => {
    const app = makeApp();
    await replyReaction({
      app,
      botToken: "xoxb-1",
      channelId: "C1",
      threadTimestamp: "1.0",
      reaction: "wave",
    });
    expect(app.client.reactions.add).toHaveBeenCalledWith({
      token: "xoxb-1",
      name: "wave",
      channel: "C1",
      timestamp: "1.0",
    });
  });

  it("rethrows on API error", async () => {
    const app = makeApp({
      reactions: { add: vi.fn().mockRejectedValue(new Error("already_reacted")) },
    });
    await expect(
      replyReaction({
        app,
        botToken: "t",
        channelId: "C",
        threadTimestamp: "0",
        reaction: "x",
      }),
    ).rejects.toThrow("already_reacted");
  });
});

describe("replyPrivateMessage", () => {
  it("forwards to chat.postEphemeral with userId", async () => {
    const app = makeApp();
    await replyPrivateMessage({
      app,
      botToken: "xoxb-1",
      channelId: "C1",
      message: "hi",
      userId: "U1",
    });
    expect(app.client.chat.postEphemeral).toHaveBeenCalledWith({
      token: "xoxb-1",
      channel: "C1",
      text: "hi",
      user: "U1",
    });
  });

  it("rethrows on API error", async () => {
    const app = makeApp({
      chat: { postEphemeral: vi.fn().mockRejectedValue(new Error("user_not_in_channel")) },
    });
    await expect(
      replyPrivateMessage({
        app,
        botToken: "t",
        channelId: "C",
        message: "x",
        userId: "U",
      }),
    ).rejects.toThrow("user_not_in_channel");
  });
});

describe("updateOrPublishView", () => {
  function makeClient() {
    return {
      views: {
        update: vi.fn().mockResolvedValue({ ok: true }),
        publish: vi.fn().mockResolvedValue({ ok: true }),
      },
    } as unknown as WebClient;
  }

  const view = { type: "home" as const, blocks: [] };

  it("calls views.update when body contains a view id", async () => {
    const client = makeClient();
    const body = { view: { id: "V1" }, user: { id: "U1" } } as never;
    await updateOrPublishView(client, body, view);
    expect(client.views.update).toHaveBeenCalledWith({ view_id: "V1", view });
    expect(client.views.publish).not.toHaveBeenCalled();
  });

  it("falls back to container.view_id when body.view is absent", async () => {
    const client = makeClient();
    const body = { container: { view_id: "V2" }, user: { id: "U1" } } as never;
    await updateOrPublishView(client, body, view);
    expect(client.views.update).toHaveBeenCalledWith({ view_id: "V2", view });
  });

  it("calls views.publish when only a user id is available", async () => {
    const client = makeClient();
    const body = { user: { id: "U1" } } as never;
    await updateOrPublishView(client, body, view);
    expect(client.views.publish).toHaveBeenCalledWith({ user_id: "U1", view });
    expect(client.views.update).not.toHaveBeenCalled();
  });

  it("rethrows API errors and logs through the supplied logger", async () => {
    const client = {
      views: {
        update: vi.fn().mockRejectedValue(new Error("not_found")),
        publish: vi.fn(),
      },
    } as unknown as WebClient;
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const body = { view: { id: "V1" }, user: { id: "U1" } } as never;
    await expect(updateOrPublishView(client, body, view, logger)).rejects.toThrow("not_found");
    expect(logger.error).toHaveBeenCalled();
  });
});

describe("sendMessageToLogChannel", () => {
  it("posts to the configured channel by name", async () => {
    const post = vi.fn().mockResolvedValue({ ok: true });
    const client = {
      conversations: {
        list: vi.fn().mockResolvedValue({
          channels: [
            { id: "C1", name: "general" },
            { id: "C2", name: "logs" },
          ],
        }),
      },
      chat: { postMessage: post },
    } as unknown as WebClient;
    await sendMessageToLogChannel("hello", client, "logs");
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0]![0]).toMatchObject({ channel: "C2" });
    expect(post.mock.calls[0]![0]!.text).toContain("hello");
  });

  it("matches channel name case-insensitively", async () => {
    const post = vi.fn().mockResolvedValue({ ok: true });
    const client = {
      conversations: {
        list: vi.fn().mockResolvedValue({
          channels: [{ id: "C9", name: "BotLogs" }],
        }),
      },
      chat: { postMessage: post },
    } as unknown as WebClient;
    await sendMessageToLogChannel("x", client, "botlogs");
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("logs a warning and skips posting when the channel does not exist", async () => {
    const post = vi.fn();
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const client = {
      conversations: {
        list: vi.fn().mockResolvedValue({ channels: [{ id: "C1", name: "general" }] }),
      },
      chat: { postMessage: post },
    } as unknown as WebClient;
    await sendMessageToLogChannel("x", client, "missing", logger);
    expect(post).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("swallows API errors so log-channel posting never breaks the caller", async () => {
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const client = {
      conversations: {
        list: vi.fn().mockRejectedValue(new Error("rate_limited")),
      },
      chat: { postMessage: vi.fn() },
    } as unknown as WebClient;
    await sendMessageToLogChannel("x", client, "logs", logger);
    expect(logger.error).toHaveBeenCalled();
  });
});
