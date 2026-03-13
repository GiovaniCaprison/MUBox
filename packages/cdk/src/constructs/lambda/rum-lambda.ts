import { Row } from "aws-cdk-lib/aws-cloudwatch";
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Key } from "aws-cdk-lib/aws-kms";
import {
  Alias,
  ApplicationLogLevel,
  Architecture,
  AssetCode,
  Function,
  FunctionUrl,
  FunctionUrlAuthType,
  LambdaInsightsVersion,
  LoggingFormat,
  Runtime,
  SystemLogLevel,
  Tracing,
} from "aws-cdk-lib/aws-lambda";
import { RemovalPolicy, Stack } from "aws-cdk-lib/core";
import { MonitoringFacade } from "cdk-monitoring-constructs";
import { Construct } from "constructs";

import { MAX_LAMBDA_FUNCTION_URL_READ_TIMEOUT } from "../../constants";
import { type Monitorable } from "../../types";
import { LogGroup, RumAppMonitor } from "../monitoring";

/**
 * Properties for the {@link RumLambda}.
 */
export interface RumLambdaProps {
  /**
   * The RUM app monitor to emit RUM events to.
   */
  readonly rumAppMonitor: RumAppMonitor;

  /**
   * The log group to write real-user monitoring logs to.
   */
  readonly rumLogs: LogGroup;
}

/**
 * A construct representing our RUM Lambda function.
 */
export class RumLambda extends Function implements Monitorable {
  /**
   * The alias for this Lambda function which has provisioned concurrency enabled.
   *
   * This alias should be used opposed to the Lambda directly given it minimizes the chances for cold starts.
   */
  public readonly alias: Alias;

  /**
   * The execution role for this Lambda function.
   */
  public readonly role: Role;

  /**
   * The URL this Lambda is available at.
   */
  public readonly url: FunctionUrl;

  /**
   * The log group that this Lambda writes to.
   */
  private readonly _rumLambdaLogGroup: LogGroup<"userEvents" | "userSessionEvents">;

  public constructor(scope: Construct, { rumAppMonitor, rumLogs }: RumLambdaProps) {
    const id = "RumLambda";

    const logGroup = new LogGroup(scope, `${id}Logs`, {
      contributorPrefix: "Rum",
      contributors: {
        userEvents: {
          aggregateOn: "Sum",
          valueOf: "$.numRumEvents",
          contributorKeys: ["$.userId"],
          filters: [{ match: "$.message", type: "In", value: ["Attempting to emit RUM events and logs concurrently..."] }],
        },
        userSessionEvents: {
          aggregateOn: "Sum",
          valueOf: "$.numRumEvents",
          contributorKeys: ["$.logStreamName"],
          filters: [{ match: "$.message", type: "In", value: ["Attempting to emit RUM events and logs concurrently..."] }],
        },
      },
      fieldsToIndex: ["cold_start", "function_request_id", "level", "message", "userId", "xray_trace_id"],
    });

    const environmentEncryption = new Key(scope, `${id}EnvironmentEncryption`, {
      alias: `${id}EnvironmentEncryption`,
      description: `The key used to encrypt the environment variables for the ${id} function`,
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    });

    const role = new Role(scope, `${id}Role`, {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      description: `The execution role for the ${id} Lambda`,
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
    });

    super(scope, id, {
      applicationLogLevelV2: ApplicationLogLevel.INFO,
      architecture: Architecture.ARM_64,
      code: new AssetCode("build/rum-lambda"),
      description: "The Lambda function responsible for processing RUM events.",
      environment: {
        // Ensures any logic that has env conditional logic runs in production mode
        NODE_ENV: "production",
        // Enables NodeJS to leverage our source map when presenting error stack traces
        NODE_OPTIONS: "--enable-source-maps",
        // Enables referencing our RUM application monitor
        RUM_APP_MONITOR_ID: rumAppMonitor.attrId,
        RUM_LOG_GROUP_NAME: rumLogs.logGroupName,
      },
      environmentEncryption,
      functionName: id,
      handler: "index.handler",
      initialPolicy: [
        // Ensures the API has permissions to put events into our RUM app monitor
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["rum:PutRumEvents"],
          resources: [rumAppMonitor.arn],
        }),
      ],
      insightsVersion: LambdaInsightsVersion.VERSION_1_0_404_0,
      logGroup,
      loggingFormat: LoggingFormat.JSON,
      memorySize: 256,
      role,
      runtime: Runtime.NODEJS_22_X,
      systemLogLevelV2: SystemLogLevel.INFO,
      timeout: MAX_LAMBDA_FUNCTION_URL_READ_TIMEOUT,
      tracing: Tracing.ACTIVE,
    });

    // Ensures that this Lambda has permissions to write client side logs
    rumLogs.grantWrite(this);

    // Allows other constructs to reference these generated artifacts.
    this._rumLambdaLogGroup = logGroup;
    this.role = role;

    // Adds the function alias that points at the latest code and the function URL which points to that alias.
    this.alias = this.addAlias("Live", {
      description:
        "The primary alias for this Lambda function that points at the latest version of this function's code. All integrations should point to this alias.",
    });
    this.url = this.alias.addFunctionUrl({ authType: FunctionUrlAuthType.AWS_IAM });

    const { account } = Stack.of(this);

    /**
     * Grants permissions for CloudFront distributions in this account to invoke this.
     *
     * We do not have access to the actual distribution id to create a more least privileged policy.
     */
    this.url.grantInvokeUrl(
      new ServicePrincipal("cloudfront.amazonaws.com", {
        conditions: { ArnLike: { ["aws:SourceArn"]: `arn:aws:cloudfront::${account}:distribution/*` } },
      }),
    );
  }

  public addMonitoring(monitoring: MonitoringFacade): void {
    const { region } = Stack.of(this);

    monitoring.monitorLambdaFunction({
      humanReadableName: `RUM`,
      isIterator: false,
      lambdaFunction: this,
      lambdaInsightsEnabled: true,
      region,
    });

    monitoring.addWidget(
      new Row(
        this._rumLambdaLogGroup.contributors.userEvents.getWidget({ title: "Events Processed By User", units: "Events" }),
        this._rumLambdaLogGroup.contributors.userSessionEvents.getWidget({ title: "Events Processed By User Session", units: "Events" }),
      ),
      false,
    );
  }
}
