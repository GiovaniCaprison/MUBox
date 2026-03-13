import { Certificate, CertificateValidation, KeyAlgorithm } from "aws-cdk-lib/aws-certificatemanager";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  HttpVersion,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
  S3OriginAccessControl,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy,
  type BehaviorOptions,
  type ICachePolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { MathExpression, type DimensionsMap, type IMetric } from "aws-cdk-lib/aws-cloudwatch";
import { AaaaRecord, ARecord, HttpsRecord, RecordTarget, type IHostedZone } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import type { ISource } from "aws-cdk-lib/aws-s3-deployment";
import { Tags } from "aws-cdk-lib/core";
import { MonitoringFacade } from "cdk-monitoring-constructs";
import { Construct } from "constructs";

import { ADDITIONAL_SECURITY_HEADERS, APP_NAME, SECURITY_HEADERS_BEHAVIOR } from "../../constants";
import type { Monitorable } from "../../types";
import { InterceptorEdgeLambda } from "../lambda";
import { CloudFrontDistributionAccessLogs } from "../monitoring";
import { WebsiteFirewall } from "./firewall";
import { StaticAssetsBucket } from "./static-assets-bucket";

/**
 * Configuration options that define an API route for this {@link WebsiteDistribution}.
 */
export interface WebsiteApiRoute extends Omit<
  BehaviorOptions,
  "edgeLambdas" | "functionAssociations" | "responseHeadersPolicy" | "viewerProtocolPolicy"
> {
  /**
   * The cache policy to be applied to this routes's cache behavior. Defaults to not having caching being
   * disabled because most API's vend dynamic data and caching can cause unexpected behavior.
   *
   * This cache policy only applies to how CloudFront caches the responses, not how the browser will
   * cache. To cache in the browser, specify a custom ResponseHeadersPolicy.
   *
   * @default CachePolicy.CACHING_DISABLED
   */
  readonly cachePolicy?: ICachePolicy;
}

/**
 * Configuration options that define API routes for this {@link WebsiteDistribution}.
 */
export type WebsiteApiRoutes = Record<string, WebsiteApiRoute>;

/**
 * Configuration options for the Website construct.
 */
export interface WebsiteProps {
  /**
   * The configuration for API routes for this website.
   *
   * This configuration will setup the appropriate CloudFront behaviors that will use cognito
   * to intercept and authenticate requests.
   */
  readonly apiRoutes: WebsiteApiRoutes;

  /**
   * The domain name for the website. Do not include `https://` as a prefix.
   *
   * @example 'mu-box.com'
   */
  readonly domainName: string;

  /**
   * Whether or not the Route 53 hosted zone has been delegated to.
   *
   * Initial creation of the Website construct should set this to `false`.
   *
   * Status of Route 53 hosted zone delegation is needed given the ACM certificates created in this
   * construct use DNS verification of ownership which will not succeed unless delegation has been
   * performed.
   */
  readonly hasRoute53HostedZoneBeenDelegatedTo: boolean;

  /**
   * The static assets to deploy to the S3 bucket behind the CloudFront distribution.
   *
   * @example [Source.asset('build/ui')]
   */
  readonly staticAssets: ISource[];

  /**
   * The Route53 hosted zone to point records at for the CloudFront distribution.
   */
  readonly route53HostedZone: IHostedZone;
}

/**
 * A construct that sets up a website in a secure manner.
 *
 * This includes setting up:
 * * A CloudFront distribution
 * * S3 buckets for the UI static assets
 * * Lambda@Edge functions for authentication and routing for the CloudFront distribution
 * * A ACM TLS certificate that will be vended by CloudFront
 * * Route 53 records to point the domain name in Route 53 at the CloudFront distribution
 * * A BucketDeployment that is used for deploying the UI to S3 as well as performing a CloudFront cache invalidation
 * * Behaviors to securely route traffic from CloudFront to the specified API routes.
 * * A WAF web ACL to protect the CloudFront distribution
 */
export class Website extends Distribution implements Monitorable {
  /**
   * Access logs for this CloudFront distribution.
   */
  public readonly accessLogs: CloudFrontDistributionAccessLogs;

  /**
   * The Lambda@Edge function used to authenticate requests to this CloudFront distribution.
   */
  public readonly interceptorEdgeLambda: InterceptorEdgeLambda;

  /**
   * The WebsiteFirewall set up to protect this CloudFront distribution.
   */
  public readonly firewall: WebsiteFirewall;

  /**
   * The certificate for this distribution.
   *
   * Present only if the Route53 hosted zone has been delegated to.
   */
  public readonly maybeCertificate: Certificate | undefined;

  /**
   * A metric tracking the total number of failed requests (5xx) from the CloudFront distribution.
   */
  public readonly metricTotalFailures: IMetric;

  /**
   * A metric tracking the total number of requests sent to the CloudFront distribution.
   */
  public readonly metricTotalRequests: IMetric;

  /**
   * The S3 bucket that static assets will be deployed to.
   */
  public readonly staticAssetsBucket: StaticAssetsBucket;

  public constructor(scope: Construct, props: WebsiteProps) {
    const { apiRoutes, hasRoute53HostedZoneBeenDelegatedTo, route53HostedZone, staticAssets } = props;

    // Creates the S3 bucket that will vend the static assets.
    const staticAssetsBucket = new StaticAssetsBucket(scope, "StaticAssets", { staticAssets });

    /**
     * Creates the InterceptorEdgeLambdas which will be used to secure the behaviors of this CloudFront distribution.
     */
    const interceptorEdgeLambda = new InterceptorEdgeLambda(scope);

    /**
     * The response header policies that ensure browsers security communicate with MUBox and perform caching if they are supposed to.
     */
    const noClientSideCachingResponseHeaderPolicy = new ResponseHeadersPolicy(scope, "NoClientSideCachingResponseHeaderPolicy", {
      comment: "The website's response header policy that includes just security headers.",
      customHeadersBehavior: { customHeaders: ADDITIONAL_SECURITY_HEADERS },
      securityHeadersBehavior: SECURITY_HEADERS_BEHAVIOR,
    });
    const withClientSideCachingResponseHeaderPolicy = new ResponseHeadersPolicy(scope, "WithClientSideCachingResponseHeaderPolicy", {
      comment: "The website's response header policy that includes both security headers and aggressive client side caching.",
      customHeadersBehavior: {
        customHeaders: [
          ...ADDITIONAL_SECURITY_HEADERS,
          // Instructs the clients to aggressively cache.
          { header: "Cache-Control", value: "public, max-age=31557600", override: false },
        ],
      },
      securityHeadersBehavior: SECURITY_HEADERS_BEHAVIOR,
    });

    const domainName = route53HostedZone.zoneName;

    /**
     * Creates the firewall that will be used to help secure the CloudFront distribution.
     */
    const firewall = new WebsiteFirewall(scope, "Firewall");

    /**
     * The origin access control used to securely communicate with our S3 bucket.
     */
    const s3OriginAccessControl = new S3OriginAccessControl(scope, "S3OriginAccessControl", {
      originAccessControlName: "S3OriginAccessControl",
      description:
        "The origin access control used to securely communicate with this application's S3 bucket which stores the website's static assets.",
    });

    /**
     * Common behavior options for both of our S3 origin behaviors.
     */
    const commonS3OriginBehaviorOptions: BehaviorOptions = {
      edgeLambdas: [interceptorEdgeLambda],
      origin: S3BucketOrigin.withOriginAccessControl(staticAssetsBucket, {
        originId: "StaticAssets",
        originAccessControl: s3OriginAccessControl,
      }),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };

    // This is expect to not have test coverage after setting up the app, but it is kept in to allow easy bootstrapping.
    /* v8 ignore next 16 */
    const certificate = hasRoute53HostedZoneBeenDelegatedTo
      ? new Certificate(scope, "Certificate", {
          domainName,
          /**
           * This is the highest that ACM can issue and is supported by CloudFront.
           *
           * @see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html#https-requirements-key-type
           */
          keyAlgorithm: KeyAlgorithm.RSA_2048,
          validation: CertificateValidation.fromDns(route53HostedZone),
        })
      : undefined;

    /**
     * Actually creates the CloudFront distribution.
     */
    super(scope, "Website", {
      certificate,
      comment: `The CloudFront distribution hosting the https://${domainName} website`,
      defaultBehavior: {
        ...commonS3OriginBehaviorOptions,
        responseHeadersPolicy: noClientSideCachingResponseHeaderPolicy,
      },
      additionalBehaviors: {
        // Everything in this directory is hashed and can be cached client-side
        ["/assets/*"]: {
          ...commonS3OriginBehaviorOptions,
          responseHeadersPolicy: withClientSideCachingResponseHeaderPolicy,
        },
        // Adds the API routes
        ...Object.fromEntries(
          Object.entries(apiRoutes).map(([route, behaviorProps]) => [
            route,
            {
              // Default to allowing all methods given opposed to just GET and HEAD given most API requests will be POST requests.
              allowedMethods: AllowedMethods.ALLOW_ALL,

              // Default to caching being disabled given most API's vend dynamic data and caching can yield unexpected results.
              cachePolicy: CachePolicy.CACHING_DISABLED,

              /**
               * This is the recommended for API origins
               * @see  https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html#managed-origin-request-policy-all-viewer-except-host-header
               */
              originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,

              // Applies the origin and any customizations
              ...behaviorProps,

              // Properties the API route cannot override to keep it secure.
              edgeLambdas: [interceptorEdgeLambda],
              responseHeadersPolicy: noClientSideCachingResponseHeaderPolicy,
              viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
            },
          ]),
        ),
      },
      // This is expect to not have test coverage after setting up the app, but it is kept in to allow easy bootstrapping.
      /* v8 ignore next */
      domainNames: hasRoute53HostedZoneBeenDelegatedTo ? [domainName] : undefined,
      httpVersion: HttpVersion.HTTP2_AND_3,
      logIncludesCookies: false, // Avoids logging the user's authentication cookies from cognito.
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_3_2025,
      publishAdditionalMetrics: true, // Enables publishing additional metrics like cache hit rates.
      webAclId: firewall.attrArn,
    });

    // Adds a name tag which is presented in the UI
    Tags.of(this).add("Name", APP_NAME);

    /**
     * Creates the appropriate Route 53 records to point the domainName at the CloudFront distribution.
     */
    const cloudFrontAliasRecordTarget = RecordTarget.fromAlias(new CloudFrontTarget(this));
    const route53RecordProps = { recordName: domainName, target: cloudFrontAliasRecordTarget, zone: route53HostedZone };
    new ARecord(this, "Route53ARecord", {
      ...route53RecordProps,
      comment: "The DNS record for routing IPv4 traffic to the CloudFront distribution",
    });
    new AaaaRecord(this, "Route53AaaaRecord", {
      ...route53RecordProps,
      comment: "The DNS record for routing IPv6 traffic to the CloudFront distribution",
    });

    /**
     * Creates an HTTPS record to improve resolution performance.
     *
     * @see https://aws.amazon.com/blogs/networking-and-content-delivery/boost-application-performance-amazon-cloudfront-enables-https-record/
     */
    new HttpsRecord(this, "Route53HTTPSRecord", {
      ...route53RecordProps,
      comment: "The DNS record for improving CloudFront DNS resolution performance",
    });

    /**
     * Enables CloudWatch access logs.
     */
    this.accessLogs = new CloudFrontDistributionAccessLogs(this);

    /**
     * Expose some of the internal constructs we generated to the client of this class.
     */
    this.maybeCertificate = certificate;
    this.interceptorEdgeLambda = interceptorEdgeLambda;
    this.firewall = firewall;
    this.staticAssetsBucket = staticAssetsBucket;

    const dimensionsMap: DimensionsMap = { DistributionId: this.distributionId, Region: "Global" };
    this.metricTotalRequests = this.metricRequests({ dimensionsMap, label: "Requests (${SUM})" });
    this.metricTotalFailures = new MathExpression({
      expression: `requests * (failureRate / 100)`,
      label: "Failures",
      usingMetrics: {
        requests: this.metricTotalRequests,
        failureRate: this.metric5xxErrorRate({ dimensionsMap }),
      },
    });

    // Deploys the assets to the CloudFront distribution
    this.staticAssetsBucket.deployAssetsAndInvalidateCloudFrontCache(this);
  }

  public addMonitoring(monitoring: MonitoringFacade): void {
    this.firewall.addMonitoring(monitoring);
    monitoring.monitorCloudFrontDistribution({ distribution: this });
    this.accessLogs.addMonitoring(monitoring);
    this.interceptorEdgeLambda.addMonitoring(monitoring);
  }
}
