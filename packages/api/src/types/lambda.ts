import type { APIGatewayProxyStructuredResultV2, Context, LambdaFunctionURLEventWithIAMAuthorizer } from "aws-lambda";

/**
 * A type representing the specific handler we have configured our application for.
 */
export type Handler = (event: LambdaFunctionURLEventWithIAMAuthorizer, context: Context) => Promise<APIGatewayProxyStructuredResultV2>;
