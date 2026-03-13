import { Duration } from "aws-cdk-lib/core";

/**
 * The max timeout for a Lambda function URL CloudFront origins without account limit increases.
 *
 * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront_origins.FunctionUrlOriginProps.html#readtimeout
 */
export const MAX_LAMBDA_FUNCTION_URL_READ_TIMEOUT = Duration.seconds(60);

/**
 * The max duration of a Lambda@Edge function configured to intercept viewer requests.
 *
 * @see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html
 */
export const MAX_VIEWER_REQUEST_EDGE_LAMBDA_DURATION = Duration.seconds(5);
