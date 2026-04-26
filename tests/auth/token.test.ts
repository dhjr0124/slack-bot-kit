import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TokenAuthStrategy } from "../../src/auth/token";
import { MemoryTokenCache } from "../../src/auth/cache";

describe("TokenAuthStrategy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches a token on first use and caches it", async () => {
    const fetchToken = vi.fn(async () => ({
      value: "tok-1",
      expiresAt: Date.now() + 60_000,
    }));
    const strategy = new TokenAuthStrategy({
      cacheKey: "k",
      headerName: "X-Access-Token",
      fetchToken,
    });

    const headers1: Record<string, string> = {};
    await strategy.applyTo(headers1);
    const headers2: Record<string, string> = {};
    await strategy.applyTo(headers2);

    expect(fetchToken).toHaveBeenCalledTimes(1);
    expect(headers1["X-Access-Token"]).toBe("tok-1");
    expect(headers2["X-Access-Token"]).toBe("tok-1");
  });

  it("re-fetches once the token enters the refresh-skew window", async () => {
    let counter = 0;
    const fetchToken = vi.fn(async () => ({
      value: `tok-${++counter}`,
      expiresAt: Date.now() + 60_000,
    }));
    const strategy = new TokenAuthStrategy({
      cacheKey: "k",
      headerName: "X-Token",
      fetchToken,
      refreshSkewMs: 30_000,
    });

    const h1: Record<string, string> = {};
    await strategy.applyTo(h1);
    expect(h1["X-Token"]).toBe("tok-1");

    // 35 seconds later: still 25s of nominal life left, but inside the 30s skew.
    vi.advanceTimersByTime(35_000);
    const h2: Record<string, string> = {};
    await strategy.applyTo(h2);
    expect(h2["X-Token"]).toBe("tok-2");
    expect(fetchToken).toHaveBeenCalledTimes(2);
  });

  it("supports a custom header prefix (e.g. Bearer)", async () => {
    const strategy = new TokenAuthStrategy({
      cacheKey: "k",
      headerName: "Authorization",
      headerPrefix: "Bearer ",
      fetchToken: async () => ({ value: "tok", expiresAt: Date.now() + 60_000 }),
    });
    const headers: Record<string, string> = {};
    await strategy.applyTo(headers);
    expect(headers["Authorization"]).toBe("Bearer tok");
  });

  it("uses an injected cache (e.g. Redis-shaped)", async () => {
    const cache = new MemoryTokenCache();
    await cache.set("k", { value: "preloaded", expiresAt: Date.now() + 60_000 });
    const fetchToken = vi.fn(async () => ({ value: "fresh", expiresAt: Date.now() + 60_000 }));
    const strategy = new TokenAuthStrategy({
      cacheKey: "k",
      headerName: "X",
      fetchToken,
      cache,
      refreshSkewMs: 0,
    });
    const headers: Record<string, string> = {};
    await strategy.applyTo(headers);
    expect(headers["X"]).toBe("preloaded");
    expect(fetchToken).not.toHaveBeenCalled();
  });
});

describe("MemoryTokenCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves an unexpired token", async () => {
    const cache = new MemoryTokenCache();
    await cache.set("k", { value: "v", expiresAt: Date.now() + 1_000 });
    expect(await cache.get("k")).toEqual({ value: "v", expiresAt: Date.now() + 1_000 });
  });

  it("evicts expired tokens on get", async () => {
    const cache = new MemoryTokenCache();
    await cache.set("k", { value: "v", expiresAt: Date.now() + 1_000 });
    vi.advanceTimersByTime(2_000);
    expect(await cache.get("k")).toBeUndefined();
  });

  it("supports explicit delete", async () => {
    const cache = new MemoryTokenCache();
    await cache.set("k", { value: "v", expiresAt: Date.now() + 1_000 });
    await cache.delete("k");
    expect(await cache.get("k")).toBeUndefined();
  });
});
