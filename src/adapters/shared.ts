import { createBoltApp, type BoltAppHandle, type CreateBoltAppOptions } from "../core/app";
import { createConsoleLogger, type Logger } from "../core/logger";
import {
  generateReceiverEvent,
  isUrlVerificationRequest,
  parseRequestBody,
} from "../utils";
import type { HandlerResponse } from "../constants";

export interface AdapterContext {
  body: string | null | undefined;
  contentType: string | undefined;
}

export interface AdapterDependencies {
  handle: BoltAppHandle;
  logger: Logger;
}

export function buildAdapterDependencies(options: CreateBoltAppOptions): AdapterDependencies {
  const logger = options.logger ?? createConsoleLogger();
  const handle = createBoltApp({ ...options, logger });
  return { handle, logger };
}

export async function processRequest(
  ctx: AdapterContext,
  deps: AdapterDependencies,
): Promise<HandlerResponse> {
  let payload: unknown;
  try {
    payload = parseRequestBody(ctx.body, ctx.contentType);
  } catch (error) {
    deps.logger.warn("Failed to parse request body", { error: String(error) });
    return { statusCode: 400, body: "Invalid request body" };
  }

  if (isUrlVerificationRequest(payload)) {
    return { statusCode: 200, body: payload.challenge };
  }

  if (payload === undefined) {
    return { statusCode: 200, body: "" };
  }

  const event = generateReceiverEvent(payload);
  await deps.handle.app.processEvent(event);

  return { statusCode: 200, body: "" };
}
