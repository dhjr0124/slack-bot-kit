import { describe, it, expect, vi } from "vitest";
import {
  parseRequestBody,
  generateReceiverEvent,
  isUrlVerificationRequest,
  getFormField,
  getFormSelectField,
  assembleUrl,
  sleep,
} from "../src/utils";

describe("parseRequestBody", () => {
  it("returns undefined for empty/null input", () => {
    expect(parseRequestBody("", "application/json")).toBeUndefined();
    expect(parseRequestBody(null, "application/json")).toBeUndefined();
    expect(parseRequestBody(undefined, "application/json")).toBeUndefined();
  });

  it("parses application/json", () => {
    const result = parseRequestBody(
      JSON.stringify({ token: "abc", team_id: "T1" }),
      "application/json",
    );
    expect(result).toEqual({ token: "abc", team_id: "T1" });
  });

  it("parses application/x-www-form-urlencoded", () => {
    const body = "token=AbCD123&team_id=T1234ABCD&team_domain=demo";
    const result = parseRequestBody(body, "application/x-www-form-urlencoded");
    expect(result).toEqual({
      token: "AbCD123",
      team_id: "T1234ABCD",
      team_domain: "demo",
    });
  });

  it("handles values containing '=' correctly (regression: original split('=') was buggy)", () => {
    const body = "signature=abc%3D%3D&token=xyz";
    const result = parseRequestBody(body, "application/x-www-form-urlencoded") as Record<
      string,
      string
    >;
    expect(result["signature"]).toBe("abc==");
    expect(result["token"]).toBe("xyz");
  });

  it("handles '+' as space in URL-encoded values", () => {
    const result = parseRequestBody("text=hello+world", "application/x-www-form-urlencoded");
    expect(result).toEqual({ text: "hello world" });
  });

  it("unwraps interactive payloads", () => {
    const inner = { type: "block_actions", actions: [{ action_id: "go-home" }] };
    const body = `payload=${encodeURIComponent(JSON.stringify(inner))}`;
    const result = parseRequestBody(body, "application/x-www-form-urlencoded");
    expect(result).toEqual(inner);
  });

  it("respects content-type with charset suffix", () => {
    const body = JSON.stringify({ ok: true });
    const result = parseRequestBody(body, "application/json; charset=utf-8");
    expect(result).toEqual({ ok: true });
  });

  it("throws on malformed JSON (callers map to 400)", () => {
    expect(() => parseRequestBody("{not-json", "application/json")).toThrow();
  });
});

describe("isUrlVerificationRequest", () => {
  it("recognises url_verification payloads", () => {
    expect(isUrlVerificationRequest({ type: "url_verification", challenge: "abc" })).toBe(true);
  });

  it("rejects payloads without challenge", () => {
    expect(isUrlVerificationRequest({ type: "url_verification" })).toBe(false);
  });

  it("rejects other event types", () => {
    expect(isUrlVerificationRequest({ type: "event_callback" })).toBe(false);
  });

  it("rejects null / undefined / non-objects", () => {
    expect(isUrlVerificationRequest(null)).toBe(false);
    expect(isUrlVerificationRequest(undefined)).toBe(false);
    expect(isUrlVerificationRequest("string")).toBe(false);
    expect(isUrlVerificationRequest(42)).toBe(false);
  });
});

describe("generateReceiverEvent", () => {
  it("wraps payload in a ReceiverEvent shape", () => {
    const event = generateReceiverEvent({ foo: "bar" });
    expect(event.body).toEqual({ foo: "bar" });
    expect(event.ack).toBeTypeOf("function");
  });

  it("ack() resolves to a 200 with empty body when called bare", async () => {
    const event = generateReceiverEvent({});
    const result = await event.ack();
    expect(result).toEqual({ statusCode: 200, body: "" });
  });

  it("ack(string) echoes the string in body", async () => {
    const event = generateReceiverEvent({});
    const result = await event.ack("hello");
    expect(result).toEqual({ statusCode: 200, body: "hello" });
  });
});

describe("getFormField", () => {
  it("extracts a text input value by block_id convention", () => {
    const body = {
      view: { state: { values: { email: { "email-value": { value: "a@b.c" } } } } },
    };
    expect(getFormField(body, "email")).toBe("a@b.c");
  });

  it("returns undefined when the block is missing", () => {
    expect(getFormField({ view: { state: { values: {} } } }, "missing")).toBeUndefined();
  });

  it("returns undefined for malformed bodies", () => {
    expect(getFormField(null, "x")).toBeUndefined();
    expect(getFormField({}, "x")).toBeUndefined();
  });
});

describe("getFormSelectField", () => {
  it("extracts a static-select selected option", () => {
    const option = { text: { type: "plain_text", text: "A", emoji: true }, value: "a" };
    const body = {
      view: {
        state: { values: { kind: { "kind-value": { selected_option: option } } } },
      },
    };
    expect(getFormSelectField(body, "kind")).toEqual(option);
  });

  it("returns undefined when nothing selected", () => {
    const body = { view: { state: { values: { kind: { "kind-value": {} } } } } };
    expect(getFormSelectField(body, "kind")).toBeUndefined();
  });
});

describe("assembleUrl", () => {
  it("uses process.env.URL when set", () => {
    const original = process.env["URL"];
    process.env["URL"] = "https://example.com";
    try {
      expect(assembleUrl({ headers: { host: "ignored" } })).toBe("https://example.com");
    } finally {
      if (original === undefined) delete process.env["URL"];
      else process.env["URL"] = original;
    }
  });

  it("falls back to the host header", () => {
    const original = process.env["URL"];
    delete process.env["URL"];
    try {
      expect(assembleUrl({ headers: { host: "abc.netlify.app" } })).toBe(
        "https://abc.netlify.app",
      );
    } finally {
      if (original !== undefined) process.env["URL"] = original;
    }
  });

  it("returns empty string when neither URL nor host is available", () => {
    const original = process.env["URL"];
    delete process.env["URL"];
    try {
      expect(assembleUrl({ headers: {} })).toBe("");
    } finally {
      if (original !== undefined) process.env["URL"] = original;
    }
  });
});

describe("sleep", () => {
  it("resolves after the requested delay", async () => {
    vi.useFakeTimers();
    const promise = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
