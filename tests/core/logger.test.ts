import { describe, it, expect, vi } from "vitest";
import { createConsoleLogger, noopLogger } from "../../src/core/logger";

function captureStream() {
  const calls: { fn: "log" | "warn" | "error"; line: string }[] = [];
  return {
    calls,
    stream: {
      log: (line: string) => calls.push({ fn: "log", line }),
      warn: (line: string) => calls.push({ fn: "warn", line }),
      error: (line: string) => calls.push({ fn: "error", line }),
    },
  };
}

describe("createConsoleLogger", () => {
  it("emits structured JSON lines", () => {
    const { calls, stream } = captureStream();
    const logger = createConsoleLogger({ stream });
    logger.info("hello", { user: "alice" });
    expect(calls).toHaveLength(1);
    const parsed = JSON.parse(calls[0]!.line);
    expect(parsed).toMatchObject({ level: "info", message: "hello", user: "alice" });
    expect(parsed.time).toBeTypeOf("string");
  });

  it("routes errors to stream.error and warns to stream.warn", () => {
    const { calls, stream } = captureStream();
    const logger = createConsoleLogger({ stream, minLevel: "debug" });
    logger.warn("warning");
    logger.error("oops");
    expect(calls.find((c) => c.fn === "warn")).toBeDefined();
    expect(calls.find((c) => c.fn === "error")).toBeDefined();
  });

  it("filters below minLevel", () => {
    const { calls, stream } = captureStream();
    const logger = createConsoleLogger({ stream, minLevel: "warn" });
    logger.debug("ignored");
    logger.info("ignored");
    logger.warn("kept");
    logger.error("kept");
    expect(calls).toHaveLength(2);
  });

  it("default minLevel is info", () => {
    const { calls, stream } = captureStream();
    const logger = createConsoleLogger({ stream });
    logger.debug("nope");
    logger.info("yes");
    expect(calls).toHaveLength(1);
  });
});

describe("noopLogger", () => {
  it("is callable and returns nothing", () => {
    expect(() => noopLogger.debug("x")).not.toThrow();
    expect(() => noopLogger.info("x")).not.toThrow();
    expect(() => noopLogger.warn("x")).not.toThrow();
    expect(() => noopLogger.error("x")).not.toThrow();
  });
});
