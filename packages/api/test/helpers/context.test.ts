import { TRPCError } from "@trpc/server";
import type { CreateAWSLambdaContextOptions } from "@trpc/server/adapters/aws-lambda";
import type { TRPCRequestInfo } from "@trpc/server/unstable-core-do-not-import";
import type { Context, LambdaFunctionURLEventWithIAMAuthorizer } from "aws-lambda";
import { describe, it, expect } from "vitest";

import { AUTHENTICATED_USER_HEADER } from "../../src/constants/cognito";
import { createContext } from "../../src/helpers/context";

// Helper function to create a mock event
const createMockEvent = (headers: Record<string, string> = {}): LambdaFunctionURLEventWithIAMAuthorizer =>
  ({
    headers,
  }) as LambdaFunctionURLEventWithIAMAuthorizer;

// Helper function to create context options
const createContextOptions = (
  event: LambdaFunctionURLEventWithIAMAuthorizer,
): CreateAWSLambdaContextOptions<LambdaFunctionURLEventWithIAMAuthorizer> => ({
  event,
  context: {} as unknown as Context,
  info: {} as unknown as TRPCRequestInfo,
});

describe("createContext", () => {
  it("should return context with userId when header is present", () => {
    const userId = "test-user";
    const event = createMockEvent({ [AUTHENTICATED_USER_HEADER]: userId });

    const options = createContextOptions(event);

    const context = createContext(options);

    expect(context).toEqual({ userId });
  });

  it("should throw TRPCError with BAD_REQUEST code when userId header is missing", () => {
    const event = createMockEvent();
    const options = createContextOptions(event);

    try {
      createContext(options);

      // If we reach this point, the function didn't throw, which is a failure
      expect.fail("Expected function to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);

      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
      expect(trpcError.message).toBe(`Received a request without the ${AUTHENTICATED_USER_HEADER} header`);
    }
  });
});
