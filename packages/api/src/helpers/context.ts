import { TRPCError } from "@trpc/server";
import type { CreateAWSLambdaContextOptions } from "@trpc/server/adapters/aws-lambda";
import type { LambdaFunctionURLEventWithIAMAuthorizer } from "aws-lambda";

import { AUTHENTICATED_USER_HEADER } from "../constants/cognito";
import type { Context } from "../types/context";

/**
 * Creates the context that will be available to all requests.
 */
export const createContext = ({ event }: CreateAWSLambdaContextOptions<LambdaFunctionURLEventWithIAMAuthorizer>): Context => {
  const userId: string | undefined = event.headers[AUTHENTICATED_USER_HEADER];
  if (!userId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Received a request without the ${AUTHENTICATED_USER_HEADER} header` });
  }

  return { userId };
};
