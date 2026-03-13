import { Vpc } from "aws-cdk-lib/aws-ec2";
import { MonitoringFacade } from "cdk-monitoring-constructs";
import type { Construct } from "constructs";

import { ApiLambda, DeploymentStack, type DeploymentStackProps } from "../../constructs";
import type { Monitorable } from "../../types";

/**
 * A CloudFormation stack that deploys the website's API.
 */
export class ApiStack extends DeploymentStack implements Monitorable {
  /**
   * The Lambda function containing our API.
   */
  public readonly apiLambda: ApiLambda;

  public constructor(scope: Construct, stackProps: DeploymentStackProps) {
    super(scope, "ApiStack", stackProps);

    /**
     * The VPC using the secure defaults provided via Secure CDK Blueprints but with networking even further locked down by:
     *
     * * Removing the internet access via removing the Internet and NAT Gateways which eliminates an additional fixed cost and forces access via Private Links
     * * Restricts the default VPC security group to eliminate implicit broad access
     *
     * To access additional services, use helpers like `vpc.addInterfaceEndpoint` to setup private links to whatever you are connecting to.
     */
    const vpc = new Vpc(this, "Vpc", {
      createInternetGateway: false,
      natGateways: 0,
      restrictDefaultSecurityGroup: true,
      vpcName: "ApiVpc",
    });

    // Sets up the Lambdas that power the backend of our website
    this.apiLambda = new ApiLambda(this, { stage: this.stage, vpc });
  }

  public addMonitoring(monitoring: MonitoringFacade): void {
    this.apiLambda.addMonitoring(monitoring);
  }
}
