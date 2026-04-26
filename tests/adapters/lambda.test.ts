import { describe, it, expect } from "vitest";
import type { APIGatewayEvent, Context } from "aws-lambda";
import { createLambdaHandler } from "../../src/adapters/lambda";

function buildEvent(body: string): APIGatewayEvent {
  return {
    body,
    headers: { "content-type": "application/json" },
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    multiValueQueryStringParameters: null,
    path: "/",
    pathParameters: null,
    queryStringParameters: null,
    requestContext: {} as APIGatewayEvent["requestContext"],
    resource: "",
    stageVariables: null,
  };
}

const baseOptions = {
  signingSecret: "secret",
  botToken: "xoxb-test",
  registerRoutes: () => {},
};

describe("createLambdaHandler", () => {
  it("returns APIGatewayProxyResult shape", async () => {
    const handler = createLambdaHandler(baseOptions);
    const result = await handler(
      buildEvent(JSON.stringify({ type: "url_verification", challenge: "x" })),
      {} as Context,
    );
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("x");
  });
});
