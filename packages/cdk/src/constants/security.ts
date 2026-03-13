import {
  HeadersFrameOption,
  HeadersReferrerPolicy,
  type ResponseCustomHeader,
  type ResponseSecurityHeadersBehavior,
} from "aws-cdk-lib/aws-cloudfront";
import { Duration } from "aws-cdk-lib/core";

/**
 * Authentication is handled entirely server-side in Lambda@Edge (auth code flow with Cognito).
 * The browser only communicates with our own CloudFront distribution, so the CSP can be locked
 * down to `'self'` without allowing any third-party origins.
 */
const CONTENT_SECURITY_POLICY =
  "default-src 'self'; font-src 'self' data:; img-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'";

/**
 * The security headers to include in all responses from our website.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
 */
export const SECURITY_HEADERS_BEHAVIOR: ResponseSecurityHeadersBehavior = {
  contentSecurityPolicy: { contentSecurityPolicy: CONTENT_SECURITY_POLICY, override: true },
  contentTypeOptions: { override: true },
  frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
  referrerPolicy: { referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
  strictTransportSecurity: { accessControlMaxAge: Duration.seconds(63072000), includeSubdomains: true, override: true, preload: true },
  xssProtection: { protection: true, modeBlock: true, override: true },
};

/**
 * A header that ensures that any cross-origin window opened from the document will not have access to the window.opener property, effectively
 * isolating the document from potential attacks by pop-ups or other cross-origin windows.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy
 */
const COOP_HEADER: ResponseCustomHeader = { header: "Cross-Origin-Opener-Policy", value: "same-origin", override: true };

/**
 * A header that restricts resource access to requests originating from the same origin to mitigate side-channel attacks.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cross-Origin_Resource_Policy
 */
const CORP_HEADER: ResponseCustomHeader = { header: "Cross-Origin-Resource-Policy", value: "same-origin", override: true };

export const ADDITIONAL_SECURITY_HEADERS: ResponseCustomHeader[] = [COOP_HEADER, CORP_HEADER];
