import { Logger } from "@aws-lambda-powertools/logger";
import { injectLambdaContext } from "@aws-lambda-powertools/logger/middleware";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { logMetrics } from "@aws-lambda-powertools/metrics/middleware";
import { parser } from "@aws-lambda-powertools/parser/middleware";
import { LambdaFunctionUrlSchema } from "@aws-lambda-powertools/parser/schemas";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer/middleware";
import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  ResourceAlreadyExistsException,
  type InputLogEvent,
} from "@aws-sdk/client-cloudwatch-logs";
import { PutRumEventsCommand, RUMClient } from "@aws-sdk/client-rum";
import middy from "@middy/core";
import { z, ZodString } from "zod";

// The environment variable keys we expect to be present when running this Lambda function.
const RUM_APP_MONITOR_ID_ENV_VARIABLE_KEY = "RUM_APP_MONITOR_ID";
const RUM_LOG_GROUP_NAME_ENV_VARIABLE_KEY = "RUM_LOG_GROUP_NAME";

/**
 * A helper for validating that the specified environment variable exists and is not empty.
 */
const envVariableValidator = (key: string): ZodString =>
  z
    .string({
      error: (issue) =>
        issue.input === undefined ? `Environment variable ${key} was not set` : `Environment variable ${key} was not a string`,
    })
    .nonempty({ error: `Environment variable ${key} was empty` });

/**
 * A helper for accessing environment variables that have been verified to be present.
 */
const environmentVariables = z
  .object({
    [RUM_APP_MONITOR_ID_ENV_VARIABLE_KEY]: envVariableValidator(RUM_APP_MONITOR_ID_ENV_VARIABLE_KEY),
    [RUM_LOG_GROUP_NAME_ENV_VARIABLE_KEY]: envVariableValidator(RUM_LOG_GROUP_NAME_ENV_VARIABLE_KEY),
  })
  .transform((parsed) => ({
    rumAppMonitorId: parsed.RUM_APP_MONITOR_ID,
    rumLogGroupName: parsed.RUM_LOG_GROUP_NAME,
  }))
  .parse(process.env);

// The observability helpers for this Lambda function.
const SERVICE_NAME = "RUM";
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: SERVICE_NAME, serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

// The instrumented AWS clients we use in this application.
const cloudwatchLogsClient = tracer.captureAWSv3Client(new CloudWatchLogsClient());
const rumClient = tracer.captureAWSv3Client(new RUMClient());

/**
 * The schema for the shape of the input we expect.
 */
const SCHEMA = LambdaFunctionUrlSchema.extend({
  // Ensures the forwarded userId is in the request headers
  headers: z.object({
    "x-authenticated-user": z.string().nonempty(),
  }),
  /**
   * The shape of the PutRumEvents input
   *
   * @see https://docs.aws.amazon.com/cloudwatchrum/latest/APIReference/API_PutRumEvents.html
   */
  body: z
    .string()
    .transform((str, ctx) => {
      try {
        return JSON.parse(str) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid JSON" });
        return z.NEVER;
      }
    })
    .pipe(
      z.object({
        AppMonitorDetails: z.object({
          version: z.string(),
        }),
        BatchId: z.string(),
        RumEvents: z.array(
          z.object({
            details: z.string(),
            id: z.string(),
            metadata: z.string(),
            timestamp: z.number(),
            type: z.string(),
          }),
        ),
        UserDetails: z.object({
          sessionId: z.string(),
          userId: z.string(),
        }),
      }),
    ),
});

/**
 * A helper for converting seconds to milliseconds.
 */
const secondsToMilliseconds = (seconds: number): number => seconds * 1_000;

/**
 * Puts the provided RUM events into CloudWatch RUM.
 */
const putRumEvents = async (userId: string, putRumEventsInput: z.infer<typeof SCHEMA>["body"]): Promise<void> => {
  await rumClient.send(
    new PutRumEventsCommand({
      AppMonitorDetails: {
        id: environmentVariables.rumAppMonitorId,
        version: putRumEventsInput.AppMonitorDetails.version,
      },
      BatchId: putRumEventsInput.BatchId,
      RumEvents: putRumEventsInput.RumEvents.map((event) => ({
        ...event,
        metadata: JSON.stringify({ ...JSON.parse(event.metadata), userId }), // Allows the filtering of sessions by the user's userId
        timestamp: new Date(secondsToMilliseconds(event.timestamp)),
      })),
      Id: environmentVariables.rumAppMonitorId,
      UserDetails: putRumEventsInput.UserDetails,
    }),
  );

  logger.info("Successfully wrote events to CloudWatch RUM");
};

/**
 * Creates a log stream for this user's session and then puts the associated logs into CloudWatch for analysis.
 */
const putRumLogs = async (userId: string, putRumEventsInput: z.infer<typeof SCHEMA>["body"]): Promise<void> => {
  // Use the userId in the log stream name to make filtering by log stream to a specific user's logs much easier
  const logStreamName = `${userId}-${putRumEventsInput.UserDetails.sessionId}`;
  const logGroupName = environmentVariables.rumLogGroupName;

  try {
    await cloudwatchLogsClient.send(new CreateLogStreamCommand({ logGroupName, logStreamName }));

    logger.info("Successfully created new log stream", { logGroupName, logStreamName });
  } catch (error) {
    // Ignore the error it already exists which will happen after initial creation of logs for that user's specific session.
    if (!(error instanceof ResourceAlreadyExistsException)) {
      throw error;
    }

    logger.info("Log stream already exists. Continuing to write RUM log events...", { logGroupName, logStreamName });
  }

  const logEvents: InputLogEvent[] = putRumEventsInput.RumEvents.map(({ id, details, timestamp, type, metadata }) => ({
    timestamp: secondsToMilliseconds(timestamp),
    message: JSON.stringify({ id, type, details: JSON.parse(details) as unknown, metadata: JSON.parse(metadata) as unknown }),
  }));

  await cloudwatchLogsClient.send(new PutLogEventsCommand({ logEvents, logGroupName, logStreamName }));

  logger.info("Successfully wrote log events to CloudWatch logs", { logGroupName, logStreamName });
};

/**
 * The handler for this Lambda function.
 */
export const handler = middy()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { resetKeys: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .use(parser({ schema: SCHEMA }))
  .handler(async (input) => {
    const userId = input.headers["x-authenticated-user"];
    const putRumEventsInput = input.body;
    const logStreamName = `${userId}-${putRumEventsInput.UserDetails.sessionId}`; // Use the userId in the log stream name to make filtering by log stream to a specific user's logs much easier

    // Ensures that the logger has context of who has submitted events and how many.
    logger.appendKeys({ logStreamName, numRumEvents: putRumEventsInput.RumEvents.length, userId });

    // Note this log line is used in CloudWatch Contributor Insights so if we ever update it we need to update the rule as well in CDK.
    logger.info("Attempting to emit RUM events and logs concurrently...");

    try {
      await Promise.all([putRumEvents(userId, putRumEventsInput), putRumLogs(userId, putRumEventsInput)]);
    } catch (error: unknown) {
      logger.error("Failed to emit RUM logs and/or events", { error });
      throw error;
    }
  });
