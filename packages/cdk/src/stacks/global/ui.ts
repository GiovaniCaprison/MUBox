import { FunctionUrlOriginAccessControl, OriginIpAddressType } from "aws-cdk-lib/aws-cloudfront";
import { FunctionUrlOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import type { IFunctionUrl } from "aws-cdk-lib/aws-lambda";
import type { IHostedZone } from "aws-cdk-lib/aws-route53";
import { Source } from "aws-cdk-lib/aws-s3-deployment";
import { Stack } from "aws-cdk-lib/core";
import { MonitoringFacade } from "cdk-monitoring-constructs";
import type { Construct } from "constructs";

import { DOMAINS, MAX_LAMBDA_FUNCTION_URL_READ_TIMEOUT } from "../../constants";
import { DeploymentStack, type DeploymentStackProps, Website, type WebsiteApiRoutes } from "../../constructs";
import type { Monitorable } from "../../types";

/**
 * Configuration options for the UIStack.
 */
export interface UIStackProps extends DeploymentStackProps {
  /**
   * The API Lambda function URLs for each region.
   */
  readonly apiFunctionUrls: IFunctionUrl[];

  /**
   * The Route 53 hosted zone for this website.
   */
  readonly route53HostedZone: IHostedZone;

  /**
   * The RUM Lambda function URL.
   */
  readonly rumFunctionUrl: IFunctionUrl;
}

/**
 * A CloudFormation stack that deploys the website including its CloudFront distribution, API, and all
 * of the other resources that support the website.
 */
export class UIStack extends DeploymentStack implements Monitorable {
  /**
   * The website containing the CloudFront distribution and other website resources.
   */
  public readonly website: Website;

  public constructor(scope: Construct, { apiFunctionUrls, route53HostedZone, rumFunctionUrl, ...stackProps }: UIStackProps) {
    super(scope, "UIStack", stackProps);

    // Sets up the origin access control that we will use to securely communicate from CloudFront to our Lambda function URLs.
    const originAccessControl = new FunctionUrlOriginAccessControl(this, "LambdaFunctionUrlOriginAccessControl", {
      originAccessControlName: "LambdaFunctionUrlOriginAccessControl",
      description: "The origin access control used to securely communicate with this application's Lambda function URL's",
    });

    /**
     * Translates the function URLs into regionalized endpoints.
     *
     * Note: We use `FunctionUrlOrigin` directly instead of `FunctionUrlOrigin.withOriginAccessControl` which includes automatic permissions setup given
     * our cross-region setup will result in the permissions failing to deploy due to these errors:
     *
     * > Functions from 'us-west-1' are not reachable in this region ('us-east-1')
     */
    const apiRoutes: WebsiteApiRoutes = apiFunctionUrls.reduce<WebsiteApiRoutes>(
      (routes, url) => ({
        ...routes,
        [`/api/${Stack.of(url).region}/*`]: {
          origin: new FunctionUrlOrigin(url, {
            ipAddressType: OriginIpAddressType.DUALSTACK,
            originId: `API-${Stack.of(url).region}`,
            originAccessControlId: originAccessControl.originAccessControlId,
            readTimeout: MAX_LAMBDA_FUNCTION_URL_READ_TIMEOUT,
          }),
        },
      }),
      {
        "/rum": {
          origin: new FunctionUrlOrigin(rumFunctionUrl, {
            ipAddressType: OriginIpAddressType.DUALSTACK,
            originId: "RUM",
            originAccessControlId: originAccessControl.originAccessControlId,
            readTimeout: MAX_LAMBDA_FUNCTION_URL_READ_TIMEOUT,
          }),
        },
      },
    );

    // Sets up the rest of the infrastructure that hosts our website
    this.website = new Website(this, {
      apiRoutes,
      route53HostedZone,
      staticAssets: [Source.asset("build/ui")],
      ...DOMAINS[this.stage],
    });
  }

  public addMonitoring(monitoring: MonitoringFacade): void {
    this.website.addMonitoring(monitoring);
  }
}
