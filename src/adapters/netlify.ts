import type { APIGatewayEvent, Context } from "aws-lambda";
import type { CreateBoltAppOptions } from "../core/app";
import type { HandlerResponse } from "../constants";
import { buildAdapterDependencies, processRequest } from "./shared";

export type NetlifyHandler = (
  event: APIGatewayEvent,
  context: Context,
) => Promise<HandlerResponse>;

/**
 * Build a Netlify Functions handler. Netlify Functions use the AWS Lambda
 * APIGatewayEvent shape, so the adapter is a thin shim over `processRequest`.
 *
 * Returns a function suitable for `export const handler = createNetlifyHandler(...)`.
 */
export function createNetlifyHandler(options: CreateBoltAppOptions): NetlifyHandler {
  const deps = buildAdapterDependencies(options);
  return async (event) => {
    return processRequest(
      {
        body: event.body,
        contentType: event.headers["content-type"] ?? event.headers["Content-Type"],
      },
      deps,
    );
  };
}
