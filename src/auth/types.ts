/**
 * Pluggable auth strategy for wrapping a third-party REST API. The kit
 * provides two reference implementations (token + basic) and an interface
 * users can implement for OAuth2, API keys, mTLS, etc.
 */
export interface AuthStrategy {
  /**
   * Mutate the supplied headers map to add whatever this strategy contributes
   * (e.g. an `Authorization: Basic ...` header, or an access token retrieved
   * from a refresh endpoint).
   */
  applyTo(headers: Record<string, string>): Promise<void>;
}
