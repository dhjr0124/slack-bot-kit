import { describe, it, expect, vi } from "vitest";
import type { App } from "@slack/bolt";
import { composeRoutes } from "../src/router";

describe("composeRoutes", () => {
  it("calls every registrar in order with the same App", () => {
    const app = {} as App;
    const calls: string[] = [];
    const registrar = composeRoutes(
      (a) => {
        expect(a).toBe(app);
        calls.push("a");
      },
      () => calls.push("b"),
      () => calls.push("c"),
    );
    registrar(app);
    expect(calls).toEqual(["a", "b", "c"]);
  });

  it("returns a no-op when given no registrars", () => {
    const app = {} as App;
    expect(() => composeRoutes()(app)).not.toThrow();
  });

  it("propagates errors from a registrar", () => {
    const app = {} as App;
    const failing = composeRoutes(
      () => {},
      () => {
        throw new Error("boom");
      },
    );
    expect(() => failing(app)).toThrow("boom");
  });

  it("each registrar can call into mocked App methods", () => {
    const app = {
      message: vi.fn(),
      action: vi.fn(),
      event: vi.fn(),
    } as unknown as App;
    composeRoutes(
      (a) => a.message("help", async () => {}),
      (a) => a.action("go-home", async () => {}),
    )(app);
    expect((app.message as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe("help");
    expect((app.action as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe("go-home");
  });
});
