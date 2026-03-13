import { injectLambdaContext } from "@aws-lambda-powertools/logger/middleware";
import { logMetrics } from "@aws-lambda-powertools/metrics/middleware";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer/middleware";
import middy from "@middy/core";
import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda";

import { logger, metrics, tracer } from "./clients/monitoring";
import { createContext } from "./helpers/context";
import { rootRouter } from "./procedures/root-router";
import type { Handler } from "./types/lambda";

// Transforms our tRPC router into a Lambda handler
const trpcHandler: Handler = awsLambdaRequestHandler({ router: rootRouter, createContext });

// Fixes the path being passed to the tRPC router.
const trpcHandlerWithFixedPath: Handler = async (event, context) => {
  // Strips out the "/api/{region}" prefix from the event
  event.rawPath = event.rawPath.replace(/^\/api\/[^\\/]+/, "");
  if (event.rawPath === "") {
    event.rawPath = "/";
  }
  event.requestContext.http.path = event.rawPath;

  return trpcHandler(event, context);
};

/**
 * Wraps our handler with metrics, logging, and tracing.
 */
export const handler: Handler = middy(trpcHandlerWithFixedPath)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }));
