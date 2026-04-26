import { describe, it, expect } from "vitest";
import { loadEnv, MissingEnvError } from "../../src/core/env";

describe("loadEnv", () => {
  it("returns parsed env when required vars are present", () => {
    const env = loadEnv({
      SLACK_SIGNING_SECRET: "secret",
      SLACK_BOT_TOKEN: "xoxb-1",
      SLACK_LOG_CHANNEL: "logs",
    });
    expect(env).toEqual({
      signingSecret: "secret",
      botToken: "xoxb-1",
      logChannel: "logs",
    });
  });

  it("treats SLACK_LOG_CHANNEL as optional", () => {
    const env = loadEnv({
      SLACK_SIGNING_SECRET: "secret",
      SLACK_BOT_TOKEN: "xoxb-1",
    });
    expect(env.logChannel).toBeUndefined();
  });

  it("throws MissingEnvError listing all missing vars at once", () => {
    let caught: unknown;
    try {
      loadEnv({});
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(MissingEnvError);
    expect((caught as MissingEnvError).missing).toEqual([
      "SLACK_SIGNING_SECRET",
      "SLACK_BOT_TOKEN",
    ]);
    expect((caught as Error).message).toContain("SLACK_SIGNING_SECRET");
    expect((caught as Error).message).toContain("SLACK_BOT_TOKEN");
  });

  it("throws when only one var is missing", () => {
    expect(() => loadEnv({ SLACK_SIGNING_SECRET: "secret" })).toThrow(MissingEnvError);
    expect(() => loadEnv({ SLACK_BOT_TOKEN: "xoxb-1" })).toThrow(MissingEnvError);
  });

  it("treats empty string as missing", () => {
    expect(() =>
      loadEnv({ SLACK_SIGNING_SECRET: "", SLACK_BOT_TOKEN: "xoxb-1" }),
    ).toThrow(MissingEnvError);
  });
});
