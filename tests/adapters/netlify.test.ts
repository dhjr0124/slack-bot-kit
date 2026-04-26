import { describe, it, expect, vi } from "vitest";
import type { APIGatewayEvent, Context } from "aws-lambda";
import { createNetlifyHandler } from "../../src/adapters/netlify";

function buildEvent(body: string, contentType = "application/json"): APIGatewayEvent {
  return {
    body,
    headers: { "content-type": contentType },
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    multiValueQueryStringParameters: null,
    path: "/.netlify/functions/slack",
    pathParameters: null,
    queryStringParameters: null,
    requestContext: {} as APIGatewayEvent["requestContext"],
    resource: "",
    stageVariables: null,
  };
}

const baseOptions = {
  signingSecret: "test-secret",
  botToken: "xoxb-test",
  registerRoutes: () => {},
  // Skip Bolt's auth.test round trip — we're not exercising real Slack API
  // calls in unit tests.
  authorize: async () => ({ botToken: "xoxb-test", botId: "B0", botUserId: "U0" }),
};

describe("createNetlifyHandler", () => {
  it("answers the URL-verification challenge synchronously", async () => {
    const handler = createNetlifyHandler(baseOptions);
    const result = await handler(
      buildEvent(JSON.stringify({ type: "url_verification", challenge: "abc-123" })),
      {} as Context,
    );
    expect(result).toEqual({ statusCode: 200, body: "abc-123" });
  });

  it("returns 200 with empty body for non-verification payloads", async () => {
    const handler = createNetlifyHandler(baseOptions);
    const result = await handler(
      buildEvent(JSON.stringify({ type: "event_callback", event: {} })),
      {} as Context,
    );
    expect(result.statusCode).toBe(200);
  });

  it("returns 400 on malformed JSON", async () => {
    const handler = createNetlifyHandler({
      ...baseOptions,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
    const result = await handler(buildEvent("{not-json"), {} as Context);
    expect(result.statusCode).toBe(400);
  });

  it("returns 200 empty for an empty body", async () => {
    const handler = createNetlifyHandler(baseOptions);
    const result = await handler(buildEvent(""), {} as Context);
    expect(result).toEqual({ statusCode: 200, body: "" });
  });

  it("invokes registerRoutes exactly once at construction time", () => {
    const register = vi.fn();
    createNetlifyHandler({ ...baseOptions, registerRoutes: register });
    expect(register).toHaveBeenCalledTimes(1);
  });
});
