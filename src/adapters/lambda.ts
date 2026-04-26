import type { APIGatewayEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import type { CreateBoltAppOptions } from "../core/app";
import { buildAdapterDependencies, processRequest } from "./shared";

export type LambdaHandler = (
  event: APIGatewayEvent,
  context: Context,
) => Promise<APIGatewayProxyResult>;

/**
 * Build a raw AWS Lambda handler (API Gateway proxy integration).
 *
 * Identical wire-shape to the Netlify handler but typed against
 * `APIGatewayProxyResult` so users get autocomplete on the response shape.
 */
export function createLambdaHandler(options: CreateBoltAppOptions): LambdaHandler {
  const deps = buildAdapterDependencies(options);
  return async (event) => {
    const result = await processRequest(
      {
        body: event.body,
        contentType: event.headers["content-type"] ?? event.headers["Content-Type"],
      },
      deps,
    );
    return {
      statusCode: result.statusCode,
      body: result.body,
      headers: result.headers,
    };
  };
}
