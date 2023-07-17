import "#internal/nitro/virtual/polyfill";
import type {
  HandlerResponse,
  HandlerContext,
  HandlerEvent,
} from "@netlify/functions";
import { withQuery } from "ufo";
import { nitroApp } from "../app";
import {
  normalizeIncomingHeadersLambda,
  normalizeOutgoingHeadersLambda,
} from "../utils";

export async function lambda(
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> {
  const query = {
    ...event.queryStringParameters,
    ...event.multiValueQueryStringParameters,
  };
  const url = withQuery(event.path, query);
  const method = event.httpMethod || "get";

  const r = await nitroApp.localCall({
    event,
    url,
    context,
    headers: normalizeIncomingHeadersLambda(event.headers),
    method,
    query,
    body: event.body, // TODO: handle event.isBase64Encoded
  });

  // Netlify functions uses lambda v1 https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.v2
  const cookies = r.headers["set-cookie"];
  return {
    statusCode: r.status,
    headers: normalizeOutgoingHeadersLambda(r.headers, true),
    body: r.body.toString(),
    ...(cookies.length > 0 && {
      multiValueHeaders: {
        "set-cookie": Array.isArray(cookies) ? cookies : [cookies],
      },
    }),
  };
}
