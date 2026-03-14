/**
 * CloudFront Lambda@Edge Authentication Middleware
 * Authentication is delegated entirely to `cognito-at-edge`, which handles:
 *
 * 1. Unauthenticated request -> redirect to Cognito Hosted UI
 * 2. Cognito redirects back with `?code=<auth_code>` -> token exchange
 * 3. Tokens are stored in secure cookies
 * 4. Subsequent requests validate the JWT automatically
 *
 * Once authenticated, this handler additionally:
 * - Injects `x-authenticated-user` so downstream services can trust the identity
 * - Applies SPA routing (rewrites unknown paths to `/index.html`)
 */

import type { CloudFrontRequest, CloudFrontRequestEvent, CloudFrontRequestResult } from "aws-lambda";
import { Authenticator } from "cognito-at-edge";

/**
 * Cognito configuration.
 *
 * This pool is shared across stages (beta, prod). The values below are
 * hardcoded because Lambda@Edge cannot receive environment variables.
 */
const REGION = "us-east-1";
const USER_POOL_ID = "us-east-1_EZQEHLRJt";
const CLIENT_ID = "6995m4a9ddsbvtl1bns9traale";
const COGNITO_DOMAIN = "mubox.auth.us-east-1.amazoncognito.com";

const authenticator = new Authenticator({
  region: REGION,
  userPoolId: USER_POOL_ID,
  userPoolAppId: CLIENT_ID,
  userPoolDomain: COGNITO_DOMAIN,
  httpOnly: true,
  sameSite: "Lax",
});

/**
 * Parse all `Cookie` request headers into a flat key/value map.
 */
function parseCookies(request: CloudFrontRequest): Record<string, string> {
  const cookies: Record<string, string> = {};
  const cookieHeaders = request.headers.cookie as { key?: string; value: string }[] | undefined;
  for (const header of cookieHeaders ?? []) {
    for (const part of header.value.split(";")) {
      const eqIdx = part.indexOf("=");
      if (eqIdx === -1) continue;
      const key = part.slice(0, eqIdx).trim();
      try {
        cookies[key] = decodeURIComponent(part.slice(eqIdx + 1).trim());
      } catch {
        // Ignore cookies with invalid percent-encoding rather than crashing the request.
      }
    }
  }
  return cookies;
}

/**
 * Apply SPA routing after authentication.
 *
 * Requests for static assets or APIs are forwarded directly.
 * All other routes are rewritten to `/index.html` so the
 * client-side router can handle the path.
 */
function handleSpaRouting(request: CloudFrontRequest): CloudFrontRequestResult {
  const { uri } = request;

  if (uri === "/favicon.ico" || uri === "/robots.txt" || uri === "/rum" || uri.startsWith("/assets/") || uri.startsWith("/api/")) {
    return request;
  }

  return { ...request, uri: "/index.html" };
}

/**
 * Lambda@Edge authentication middleware.
 *
 * This function runs during the CloudFront Viewer Request phase
 * and protects the MUBox SPA using Amazon Cognito.
 */
export const handler = async (event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> => {
  // cognito-at-edge handles the full OAuth flow:
  // - Redirect to Cognito Hosted UI when unauthenticated
  // - Authorization code exchange
  // - JWT verification on every request
  // - Silent token refresh via refresh token
  //
  // Returns a CloudFrontResultResponse (has `status`) when it needs to send a
  // redirect or set-cookie response, or the original CloudFrontRequest when the
  // user is authenticated and the request should proceed.
  const result = await authenticator.handle(event);

  if ("status" in result) {
    return result;
  }

  // Authenticated: decode the already-verified idToken to extract the user's
  // sub and inject it as a trusted header for downstream services.
  // cognito-at-edge stores tokens using Amplify cookie naming:
  //   CognitoIdentityServiceProvider.{clientId}.LastAuthUser        -> username
  //   CognitoIdentityServiceProvider.{clientId}.{username}.idToken  -> JWT
  const cookies = parseCookies(result);
  const lastAuthUser = cookies[`CognitoIdentityServiceProvider.${CLIENT_ID}.LastAuthUser`];
  const idToken = lastAuthUser ? cookies[`CognitoIdentityServiceProvider.${CLIENT_ID}.${lastAuthUser}.idToken`] : undefined;

  if (idToken) {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString()) as { "cognito:username": string };

    result.headers["x-authenticated-user"] = [{ key: "x-authenticated-user", value: payload["cognito:username"] }];
  }

  return handleSpaRouting(result);
};
