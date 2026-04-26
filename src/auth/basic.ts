import type { AuthStrategy } from "./types";

export interface BasicAuthOptions {
  username: string;
  password: string;
  headerName?: string;
}

/**
 * HTTP Basic auth strategy. Encodes `username:password` as Base64 and
 * sets the configured header (defaults to `Authorization`).
 */
export class BasicAuthStrategy implements AuthStrategy {
  private readonly headerName: string;
  private readonly headerValue: string;

  constructor(options: BasicAuthOptions) {
    this.headerName = options.headerName ?? "Authorization";
    const encoded = Buffer.from(`${options.username}:${options.password}`).toString("base64");
    this.headerValue = `Basic ${encoded}`;
  }

  async applyTo(headers: Record<string, string>): Promise<void> {
    headers[this.headerName] = this.headerValue;
  }
}
