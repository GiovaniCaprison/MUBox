/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unsafe-call, no-useless-catch */
import type { Context, APIGatewayProxyEventV2 } from "aws-lambda";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock AWS SDK clients
const mockSend = vi.fn();
vi.mock("@aws-sdk/client-cloudwatch-logs", () => ({
  CloudWatchLogsClient: vi.fn(() => ({ send: mockSend })),
  CreateLogStreamCommand: vi.fn((params: unknown) => ({
    type: "CreateLogStreamCommand",
    ...(params as object),
  })),
  PutLogEventsCommand: vi.fn((params: unknown) => ({
    type: "PutLogEventsCommand",
    ...(params as object),
  })),
  ResourceAlreadyExistsException: class extends Error {
    constructor(message = "Resource already exists") {
      super(message);
      this.name = "ResourceAlreadyExistsException";
    }
  },
}));

vi.mock("@aws-sdk/client-rum", () => ({
  RUMClient: vi.fn(() => ({ send: mockSend })),
  PutRumEventsCommand: vi.fn((params: unknown) => ({
    type: "PutRumEventsCommand",
    ...(params as object),
  })),
}));

// Mock AWS Lambda Powertools
vi.mock("@aws-lambda-powertools/logger", () => ({
  Logger: vi.fn(() => ({
    appendKeys: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@aws-lambda-powertools/metrics", () => ({
  Metrics: vi.fn(() => ({})),
}));

vi.mock("@aws-lambda-powertools/tracer", () => ({
  Tracer: vi.fn(() => ({
    captureAWSv3Client: vi.fn((client: unknown) => client),
  })),
}));

vi.mock("@aws-lambda-powertools/logger/middleware", () => ({
  injectLambdaContext: vi.fn(() => ({ before: vi.fn(), after: vi.fn() })),
}));

vi.mock("@aws-lambda-powertools/metrics/middleware", () => ({
  logMetrics: vi.fn(() => ({ before: vi.fn(), after: vi.fn() })),
}));

vi.mock("@aws-lambda-powertools/tracer/middleware", () => ({
  captureLambdaHandler: vi.fn(() => ({ before: vi.fn(), after: vi.fn() })),
}));

vi.mock("@aws-lambda-powertools/parser/middleware", () => ({
  parser: vi.fn(({ schema }: { schema: { parse: (event: unknown) => unknown } }) => ({
    before: vi.fn((request: { event: APIGatewayProxyEventV2 }) => {
      // Simulate the actual parser middleware behavior
      try {
        const result = schema.parse(request.event);
        request.event = result as APIGatewayProxyEventV2;
      } catch (error) {
        throw error; // Let validation errors bubble up
      }
    }),
    after: vi.fn(),
  })),
}));

describe("RUM Lambda Handler", () => {
  const originalEnv = process.env;
  let handler: any; // Use any for the handler to avoid complex type issues in tests
  let resourceAlreadyExistsException: any; // Use any for the exception class

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      RUM_APP_MONITOR_ID: "test-monitor-id",
      RUM_LOG_GROUP_NAME: "test-log-group",
    };

    // Import handler after setting environment variables
    vi.resetModules();
    const module = await import("../src");
    handler = module.handler;

    // Import the mocked exception class
    const cloudwatchModule = await import("@aws-sdk/client-cloudwatch-logs");
    resourceAlreadyExistsException = cloudwatchModule.ResourceAlreadyExistsException;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createValidInput = (): APIGatewayProxyEventV2 => ({
    version: "2.0",
    routeKey: "POST /rum",
    rawPath: "/rum",
    rawQueryString: "",
    headers: {
      "x-authenticated-user": "test-user",
    },
    requestContext: {
      accountId: "123456789012",
      apiId: "test-api",
      domainName: "test.amazonaws.com",
      domainPrefix: "test",
      http: {
        method: "POST" as const,
        path: "/rum",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "test-agent",
      },
      requestId: "test-request-id",
      routeKey: "POST /rum",
      stage: "$default",
      time: "01/Jan/2022:00:00:00 +0000",
      timeEpoch: 1640995200000,
    },
    body: JSON.stringify({
      AppMonitorDetails: {
        version: "1.0.0",
      },
      BatchId: "batch-123",
      RumEvents: [
        {
          details: '{"page":"home"}',
          id: "event-1",
          metadata: '{"browser":"chrome"}',
          timestamp: 1640995200,
          type: "page_view",
        },
      ],
      UserDetails: {
        sessionId: "session-123",
        userId: "user-123",
      },
    }),
    isBase64Encoded: false,
  });

  const createContext = (): Context => ({
    callbackWaitsForEmptyEventLoop: false,
    functionName: "test-function",
    functionVersion: "1",
    invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test-function",
    memoryLimitInMB: "128",
    awsRequestId: "test-request-id",
    logGroupName: "/aws/lambda/test-function",
    logStreamName: "2022/01/01/[$LATEST]test-stream",
    getRemainingTimeInMillis: () => 30000,
    done: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn(),
  });

  it("should process RUM events successfully", async () => {
    const input = createValidInput();
    const context = createContext();
    mockSend.mockResolvedValue({});

    await handler(input, context);

    expect(mockSend).toHaveBeenCalledTimes(3); // CreateLogStream, PutRumEvents, PutLogEvents

    // Verify PutRumEventsCommand
    const rumCall = mockSend.mock.calls.find(
      (call: unknown[]) => call[0] && typeof call[0] === "object" && "type" in call[0] && call[0].type === "PutRumEventsCommand",
    );
    expect(rumCall).toBeDefined();
    if (rumCall?.[0] && typeof rumCall[0] === "object") {
      expect(rumCall[0]).toMatchObject({
        AppMonitorDetails: {
          id: "test-monitor-id",
          version: "1.0.0",
        },
        BatchId: "batch-123",
        Id: "test-monitor-id",
      });
    }

    // Verify CreateLogStreamCommand
    const createLogStreamCall = mockSend.mock.calls.find(
      (call: unknown[]) => call[0] && typeof call[0] === "object" && "type" in call[0] && call[0].type === "CreateLogStreamCommand",
    );
    expect(createLogStreamCall).toBeDefined();
    if (createLogStreamCall?.[0] && typeof createLogStreamCall[0] === "object") {
      expect(createLogStreamCall[0]).toMatchObject({
        logGroupName: "test-log-group",
        logStreamName: "test-user-session-123",
      });
    }

    // Verify PutLogEventsCommand
    const putLogEventsCall = mockSend.mock.calls.find(
      (call: unknown[]) => call[0] && typeof call[0] === "object" && "type" in call[0] && call[0].type === "PutLogEventsCommand",
    );
    expect(putLogEventsCall).toBeDefined();
    if (putLogEventsCall?.[0] && typeof putLogEventsCall[0] === "object") {
      expect(putLogEventsCall[0]).toMatchObject({
        logGroupName: "test-log-group",
        logStreamName: "test-user-session-123",
      });
    }
  });

  it("should handle ResourceAlreadyExistsException when creating log stream", async () => {
    const input = createValidInput();
    const context = createContext();

    // Create an error that will be recognized as ResourceAlreadyExistsException
    const exception = Object.create(resourceAlreadyExistsException.prototype);
    exception.message = "Resource already exists";
    exception.name = "ResourceAlreadyExistsException";

    // The calls happen in parallel due to Promise.all, so we need to handle both paths
    mockSend
      .mockResolvedValueOnce({}) // PutRumEvents (first in Promise.all)
      .mockRejectedValueOnce(exception) // CreateLogStream (fails)
      .mockResolvedValueOnce({}); // PutLogEvents (after CreateLogStream is handled)

    await handler(input, context);

    expect(mockSend).toHaveBeenCalledTimes(3); // PutRumEvents, CreateLogStream (fails), PutLogEvents
  });

  it("should throw error for non-ResourceAlreadyExistsException when creating log stream", async () => {
    const input = createValidInput();
    const context = createContext();
    const error = new Error("Other error");

    mockSend
      .mockResolvedValueOnce({}) // PutRumEvents (first in Promise.all)
      .mockRejectedValueOnce(error) // CreateLogStream (fails with different error)
      .mockResolvedValueOnce({}); // This won't be called due to error

    await expect(handler(input, context)).rejects.toThrow("Other error");
  });

  it("should handle non-ResourceAlreadyExistsException during log stream creation", async () => {
    const input = createValidInput();
    const context = createContext();
    const error = new Error("Network error");
    error.name = "NetworkError";

    mockSend
      .mockResolvedValueOnce({}) // PutRumEvents (first in Promise.all)
      .mockRejectedValueOnce(error) // CreateLogStream (fails with different error)
      .mockResolvedValueOnce({}); // This won't be called due to error

    await expect(handler(input, context)).rejects.toThrow("Network error");
  });

  it("should transform RUM events with userId in metadata", async () => {
    const input = createValidInput();
    const context = createContext();
    mockSend.mockResolvedValue({});

    await handler(input, context);

    const rumCall = mockSend.mock.calls.find(
      (call: unknown[]) => call[0] && typeof call[0] === "object" && "type" in call[0] && call[0].type === "PutRumEventsCommand",
    );

    if (rumCall?.[0] && typeof rumCall[0] === "object" && "RumEvents" in rumCall[0] && Array.isArray(rumCall[0].RumEvents)) {
      const rumEvent = rumCall[0].RumEvents[0];
      if (rumEvent && typeof rumEvent === "object" && "metadata" in rumEvent && typeof rumEvent.metadata === "string") {
        const metadata = JSON.parse(rumEvent.metadata) as Record<string, unknown>;
        expect(metadata).toMatchObject({
          browser: "chrome",
          userId: "test-user",
        });
      }

      if (rumEvent && typeof rumEvent === "object" && "timestamp" in rumEvent) {
        expect(rumEvent.timestamp).toBeInstanceOf(Date);
        expect((rumEvent.timestamp as Date).getTime()).toBe(1640995200000);
      }
    }
  });

  it("should create log events with correct format", async () => {
    const input = createValidInput();
    const context = createContext();
    mockSend.mockResolvedValue({});

    await handler(input, context);

    const putLogEventsCall = mockSend.mock.calls.find(
      (call: unknown[]) => call[0] && typeof call[0] === "object" && "type" in call[0] && call[0].type === "PutLogEventsCommand",
    );

    if (
      putLogEventsCall?.[0] &&
      typeof putLogEventsCall[0] === "object" &&
      "logEvents" in putLogEventsCall[0] &&
      Array.isArray(putLogEventsCall[0].logEvents)
    ) {
      const logEvent = putLogEventsCall[0].logEvents[0];
      if (logEvent && typeof logEvent === "object" && "timestamp" in logEvent && "message" in logEvent) {
        expect(logEvent.timestamp).toBe(1640995200000);

        if (typeof logEvent.message === "string") {
          const message = JSON.parse(logEvent.message) as Record<string, unknown>;
          expect(message).toMatchObject({
            id: "event-1",
            type: "page_view",
            details: { page: "home" },
            metadata: { browser: "chrome" },
          });
        }
      }
    }
  });

  it("should handle invalid JSON in body", async () => {
    const input = createValidInput();
    const context = createContext();

    // Set invalid JSON in body
    input.body = "invalid json {";

    await expect(handler(input, context)).rejects.toThrow();
  });

  it("should handle multiple RUM events", async () => {
    const input = createValidInput();
    const context = createContext();

    // Update the body to include multiple events
    const bodyData = JSON.parse(input.body || "{}") as Record<string, unknown>;
    bodyData.RumEvents = [
      {
        details: '{"page":"home"}',
        id: "event-1",
        metadata: '{"browser":"chrome"}',
        timestamp: 1640995200,
        type: "page_view",
      },
      {
        details: '{"action":"click"}',
        id: "event-2",
        metadata: '{"element":"button"}',
        timestamp: 1640995300,
        type: "user_interaction",
      },
    ];
    input.body = JSON.stringify(bodyData);

    mockSend.mockResolvedValue({});

    await handler(input, context);

    const rumCall = mockSend.mock.calls.find(
      (call: unknown[]) => call[0] && typeof call[0] === "object" && "type" in call[0] && call[0].type === "PutRumEventsCommand",
    );

    if (rumCall?.[0] && typeof rumCall[0] === "object" && "RumEvents" in rumCall[0] && Array.isArray(rumCall[0].RumEvents)) {
      expect(rumCall[0].RumEvents).toHaveLength(2);
    }

    const putLogEventsCall = mockSend.mock.calls.find(
      (call: unknown[]) => call[0] && typeof call[0] === "object" && "type" in call[0] && call[0].type === "PutLogEventsCommand",
    );

    if (
      putLogEventsCall?.[0] &&
      typeof putLogEventsCall[0] === "object" &&
      "logEvents" in putLogEventsCall[0] &&
      Array.isArray(putLogEventsCall[0].logEvents)
    ) {
      expect(putLogEventsCall[0].logEvents).toHaveLength(2);
    }
  });

  describe("Environment Variable Validation", () => {
    it("should throw error when RUM_APP_MONITOR_ID is missing", async () => {
      delete process.env.RUM_APP_MONITOR_ID;

      await expect(async () => {
        // Re-import to trigger environment variable parsing
        vi.resetModules();
        await import("../src");
      }).rejects.toThrow("Environment variable RUM_APP_MONITOR_ID was not set");
    });

    it("should throw error when RUM_LOG_GROUP_NAME is missing", async () => {
      delete process.env.RUM_LOG_GROUP_NAME;

      await expect(async () => {
        vi.resetModules();
        await import("../src");
      }).rejects.toThrow("Environment variable RUM_LOG_GROUP_NAME was not set");
    });

    it("should throw error when RUM_APP_MONITOR_ID is empty", async () => {
      process.env.RUM_APP_MONITOR_ID = "";

      await expect(async () => {
        vi.resetModules();
        await import("../src");
      }).rejects.toThrow("Environment variable RUM_APP_MONITOR_ID was empty");
    });

    it("should throw error when RUM_LOG_GROUP_NAME is empty", async () => {
      process.env.RUM_LOG_GROUP_NAME = "";

      await expect(async () => {
        vi.resetModules();
        await import("../src");
      }).rejects.toThrow("Environment variable RUM_LOG_GROUP_NAME was empty");
    });

    it("should throw error when RUM_APP_MONITOR_ID is not a string", async () => {
      // Set environment variable to a non-string value (this simulates the case where process.env has a non-string value)
      (process.env as any).RUM_APP_MONITOR_ID = 123;

      await expect(async () => {
        vi.resetModules();
        await import("../src");
      }).rejects.toThrow("Environment variable RUM_APP_MONITOR_ID was not a string");
    });
  });

  describe("secondsToMilliseconds helper", () => {
    it("should convert seconds to milliseconds correctly", async () => {
      // Test the conversion indirectly through timestamp handling
      const input = createValidInput();
      const context = createContext();

      // Update timestamp in the body
      const bodyData = JSON.parse(input.body || "{}") as Record<string, unknown>;
      if (bodyData.RumEvents && Array.isArray(bodyData.RumEvents) && bodyData.RumEvents[0]) {
        const event = bodyData.RumEvents[0] as Record<string, unknown>;
        event.timestamp = 1640995200; // 1 second
      }
      input.body = JSON.stringify(bodyData);

      mockSend.mockResolvedValue({});

      await handler(input, context);

      const rumCall = mockSend.mock.calls.find(
        (call: unknown[]) => call[0] && typeof call[0] === "object" && "type" in call[0] && call[0].type === "PutRumEventsCommand",
      );

      if (rumCall?.[0] && typeof rumCall[0] === "object" && "RumEvents" in rumCall[0] && Array.isArray(rumCall[0].RumEvents)) {
        const rumEvent = rumCall[0].RumEvents[0];
        if (rumEvent && typeof rumEvent === "object" && "timestamp" in rumEvent) {
          expect((rumEvent.timestamp as Date).getTime()).toBe(1640995200000);
        }
      }
    });
  });
});
