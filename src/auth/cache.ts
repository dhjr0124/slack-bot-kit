export interface CachedToken {
  value: string;
  expiresAt: number;
}

/**
 * Token cache interface — implement against Redis, DynamoDB, Vercel KV, etc.
 * The kit ships an in-memory default; production deployments running
 * multi-instance should plug a shared store so cache misses don't multiply
 * with replicas.
 */
export interface TokenCache {
  get(key: string): Promise<CachedToken | undefined>;
  set(key: string, token: CachedToken): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * In-memory cache with TTL eviction. Suitable for single-instance Lambda
 * cold-start lifetimes; not for distributed deployments.
 */
export class MemoryTokenCache implements TokenCache {
  private readonly store = new Map<string, CachedToken>();

  async get(key: string): Promise<CachedToken | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  async set(key: string, token: CachedToken): Promise<void> {
    this.store.set(key, token);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
