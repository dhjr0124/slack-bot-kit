import { describe, it, expect } from "vitest";
import { BasicAuthStrategy } from "../../src/auth/basic";

describe("BasicAuthStrategy", () => {
  it("emits a Base64-encoded Authorization header by default", async () => {
    const strategy = new BasicAuthStrategy({ username: "alice", password: "secret" });
    const headers: Record<string, string> = {};
    await strategy.applyTo(headers);
    const expected = `Basic ${Buffer.from("alice:secret").toString("base64")}`;
    expect(headers["Authorization"]).toBe(expected);
  });

  it("allows the header name to be overridden", async () => {
    const strategy = new BasicAuthStrategy({
      username: "u",
      password: "p",
      headerName: "X-Auth",
    });
    const headers: Record<string, string> = {};
    await strategy.applyTo(headers);
    expect(headers["X-Auth"]).toMatch(/^Basic /);
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("does not mutate other headers", async () => {
    const strategy = new BasicAuthStrategy({ username: "u", password: "p" });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    await strategy.applyTo(headers);
    expect(headers["Content-Type"]).toBe("application/json");
  });
});
