import type { AuthStrategy } from "./types";
import { MemoryTokenCache, type TokenCache } from "./cache";

export interface TokenAuthOptions {
  /** Stable cache key. Use a per-tenant string if rotating credentials. */
  cacheKey: string;
  /** Header name carrying the access token (e.g. `Authorization`). */
  headerName: string;
  /**
   * Optional prefix prepended to the token value. Common values: `"Bearer "`,
   * `""` (empty for raw tokens). Defaults to empty.
   */
  headerPrefix?: string;
  /**
   * Function that fetches a fresh token. Must return the token value plus
   * an absolute expiry timestamp in milliseconds (UTC).
   */
  fetchToken: () => Promise<{ value: string; expiresAt: number }>;
  /**
   * Refresh skew in milliseconds — how far before `expiresAt` to consider
   * the cached token stale. Defaults to 30 seconds.
   */
  refreshSkewMs?: number;
  /** Override the default in-memory cache. */
  cache?: TokenCache;
}

/**
 * Token-with-refresh strategy. Caches the token and re-fetches it shortly
 * before expiry to avoid mid-request 401s.
 *
 * The cache is pluggable so multi-instance deployments can share state
 * (Redis / DynamoDB / Vercel KV).
 */
export class TokenAuthStrategy implements AuthStrategy {
  private readonly cache: TokenCache;
  private readonly skew: number;

  constructor(private readonly options: TokenAuthOptions) {
    this.cache = options.cache ?? new MemoryTokenCache();
    this.skew = options.refreshSkewMs ?? 30_000;
  }

  async applyTo(headers: Record<string, string>): Promise<void> {
    const token = await this.getToken();
    const prefix = this.options.headerPrefix ?? "";
    headers[this.options.headerName] = `${prefix}${token}`;
  }

  private async getToken(): Promise<string> {
    const cached = await this.cache.get(this.options.cacheKey);
    if (cached && cached.expiresAt - this.skew > Date.now()) {
      return cached.value;
    }
    const fresh = await this.options.fetchToken();
    await this.cache.set(this.options.cacheKey, fresh);
    return fresh.value;
  }
}
