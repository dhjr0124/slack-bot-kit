import { describe, it, expect, vi } from "vitest";
import { createVercelHandler, type VercelRequest, type VercelResponse } from "../../src/adapters/vercel";

function buildResponse() {
  let statusCode = 0;
  let body = "";
  const headers: Record<string, string> = {};
  const res: VercelResponse = {
    status(code) {
      statusCode = code;
      return res;
    },
    setHeader(name, value) {
      headers[name] = value;
    },
    send(b) {
      body = b;
    },
    end(b) {
      if (b !== undefined) body = b;
    },
  };
  return {
    res,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    headers,
  };
}

function buildRequest(body: unknown, contentType = "application/json"): VercelRequest {
  return {
    method: "POST",
    headers: { "content-type": contentType },
    body,
    on: vi.fn(),
  };
}

const baseOptions = {
  signingSecret: "secret",
  botToken: "xoxb-test",
  registerRoutes: () => {},
};

describe("createVercelHandler", () => {
  it("answers URL verification with the challenge string", async () => {
    const handler = createVercelHandler(baseOptions);
    const captured = buildResponse();
    await handler(
      buildRequest({ type: "url_verification", challenge: "ping" }),
      captured.res,
    );
    expect(captured.statusCode).toBe(200);
    expect(captured.body).toBe("ping");
  });

  it("re-stringifies pre-parsed JSON body objects", async () => {
    const handler = createVercelHandler(baseOptions);
    const captured = buildResponse();
    await handler(
      buildRequest({ type: "url_verification", challenge: "abc" }),
      captured.res,
    );
    expect(captured.body).toBe("abc");
  });

  it("accepts string bodies", async () => {
    const handler = createVercelHandler(baseOptions);
    const captured = buildResponse();
    await handler(
      buildRequest(JSON.stringify({ type: "url_verification", challenge: "str" })),
      captured.res,
    );
    expect(captured.body).toBe("str");
  });
});
