import { describe, it, expect, vi } from "vitest";
import { createExpressApp } from "../../src/adapters/express";

const baseOptions = {
  signingSecret: "secret",
  botToken: "xoxb-test",
  registerRoutes: () => {},
  authorize: async () => ({ botToken: "xoxb-test", botId: "B0", botUserId: "U0" }),
};

describe("createExpressApp", () => {
  it("returns an Express router and a start function", () => {
    const handle = createExpressApp(baseOptions);
    expect(handle.router).toBeDefined();
    // The router is Bolt's underlying ExpressReceiver.router — an IRouter
    // function with .use / .get / .post methods.
    expect(typeof handle.router.use).toBe("function");
    expect(typeof handle.router.post).toBe("function");
    expect(typeof handle.start).toBe("function");
  });

  it("invokes registerRoutes once at construction time", () => {
    const register = vi.fn();
    createExpressApp({ ...baseOptions, registerRoutes: register });
    expect(register).toHaveBeenCalledTimes(1);
  });
});
