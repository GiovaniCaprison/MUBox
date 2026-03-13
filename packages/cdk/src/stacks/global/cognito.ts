import {
  AccountRecovery,
  OAuthScope,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  UserPoolDomain,
} from "aws-cdk-lib/aws-cognito";
import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib/core";
import { Construct } from "constructs";

import { APP_NAME } from "../../constants";

export interface CognitoStackProps extends StackProps {
  /**
   * The domain names that are permitted to receive Cognito auth callbacks.
   *
   * Both beta and prod domains are registered so that a single shared User Pool
   * serves all stages without requiring per-stage Cognito infrastructure.
   *
   * @example ["beta.mu-box.com", "mu-box.com"]
   */
  readonly allowedDomains: string[];
}

/**
 * A CloudFormation stack that deploys a shared Amazon Cognito User Pool.
 *
 * A single pool is reused across all stages (beta, prod). Because the
 * Lambda@Edge interceptor derives the redirect URI from the incoming
 * `host` header at runtime, no per-stage configuration is required here —
 * we simply register every stage's domain as an allowed callback URL.
 *
 * Authentication flow:
 *
 *  1. Unauthenticated request → interceptor redirects to Cognito Hosted UI.
 *  2. User signs in; Cognito redirects back with `?code=<auth_code>`.
 *  3. Interceptor exchanges the code for an ID token server-side.
 *  4. ID token stored in a Secure, HttpOnly cookie.
 *  5. Subsequent requests verify the JWT and inject `x-authenticated-user`.
 *
 * No client secret is used (public client / SPA mode). This avoids the
 * deploy-time chicken-and-egg problem of injecting a generated secret into
 * the Lambda@Edge bundle, which cannot receive environment variables.
 * The Authorization Code flow without a secret is the standard approach for
 * server-side Lambda@Edge auth — the token exchange itself happens in a
 * trusted server environment, not the browser.
 */
export class CognitoStack extends Stack {
  /**
   * The shared Cognito User Pool.
   */
  public readonly userPool: UserPool;

  /**
   * The Hosted UI domain.
   *
   * Full domain: `{appName}.auth.us-east-1.amazoncognito.com`
   */
  public readonly userPoolDomain: UserPoolDomain;

  /**
   * The app client used by the Lambda@Edge interceptor across all stages.
   */
  public readonly userPoolClient: UserPoolClient;

  public constructor(scope: Construct, props: CognitoStackProps) {
    super(scope, "SharedCognitoStack", props);

    const appNameLower = APP_NAME.toLowerCase();

    /**
     * The User Pool.
     *
     * Self sign-up is enabled — anyone can register with a username and email address.
     * Users choose a unique, immutable username at sign-up which is used to identify them
     * throughout the application. Email verification is required before sign-in.
     * The password policy requires strong credentials and MFA can be added later.
     */
    this.userPool = new UserPool(this, "UserPool", {
      userPoolName: APP_NAME,
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { username: true, email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(7),
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      // RETAIN so that an accidental stack deletion does not lock out all users.
      removalPolicy: RemovalPolicy.RETAIN,
    });

    /**
     * The Cognito Hosted UI domain.
     *
     * Full domain: {appNameLower}.auth.us-east-1.amazoncognito.com
     */
    this.userPoolDomain = this.userPool.addDomain("HostedUiDomain", {
      cognitoDomain: { domainPrefix: appNameLower },
    });

    /**
     * The app client used by the Lambda@Edge interceptor.
     *
     * No client secret is used (public client). The redirect URI is validated
     * against this allowlist instead, which is sufficient for a server-side
     * Lambda@Edge flow where the browser never handles tokens directly.
     */
    this.userPoolClient = this.userPool.addClient("MUBoxWebClient", {
      userPoolClientName: "MUBoxWebClient",
      generateSecret: false,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE],
        callbackUrls: props.allowedDomains.map((d) => `https://${d}`),
        logoutUrls: props.allowedDomains.map((d) => `https://${d}`),
      },
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
      refreshTokenValidity: Duration.days(30),
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      enableTokenRevocation: true,
      preventUserExistenceErrors: true,
    });
  }
}
