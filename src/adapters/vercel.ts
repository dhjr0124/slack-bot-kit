import type { CreateBoltAppOptions } from "../core/app";
import { buildAdapterDependencies, processRequest } from "./shared";

/**
 * Minimal subsets of @vercel/node's request/response shapes — declared inline
 * so this kit doesn't require @vercel/node as a dep.
 */
export interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  on(event: "data" | "end" | "error", listener: (...args: unknown[]) => void): unknown;
}

export interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
  end(body?: string): void;
}

export type VercelHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

async function readRawBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") {
    // Vercel auto-parses JSON when content-type is application/json. Re-stringify
    // so downstream `parseRequestBody` can JSON.parse it back uniformly.
    return JSON.stringify(req.body);
  }
  // Fallback: stream the body manually. Rarely needed because Vercel pre-buffers.
  const chunks: Buffer[] = [];
  return new Promise<string>((resolve, reject) => {
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk as Buffer | string)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", (err) => reject(err as Error));
  });
}

/**
 * Build a Vercel serverless function handler.
 *
 * Returns a function suitable for `export default createVercelHandler(...)`.
 */
export function createVercelHandler(options: CreateBoltAppOptions): VercelHandler {
  const deps = buildAdapterDependencies(options);
  return async (req, res) => {
    const body = await readRawBody(req);
    const result = await processRequest(
      { body, contentType: headerValue(req.headers, "content-type") },
      deps,
    );
    if (result.headers) {
      for (const [name, value] of Object.entries(result.headers)) {
        res.setHeader(name, value);
      }
    }
    res.status(result.statusCode).send(result.body);
  };
}
