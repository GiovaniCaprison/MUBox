import { OPERATIONS } from "@mubox/local-shared";
import { Row } from "aws-cdk-lib/aws-cloudwatch";
import type { IVpc } from "aws-cdk-lib/aws-ec2";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
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
import { MetricStatistic, MonitoringFacade } from "cdk-monitoring-constructs";
import { Construct } from "constructs";

import { MAX_LAMBDA_FUNCTION_URL_READ_TIMEOUT } from "../../constants";
import { isProd } from "../../stacks";
import { type Monitorable, Stage } from "../../types";
import { type ContributorInsightsRulePropsWithoutLogGroup, type Filter, type JsonProperty, LogGroup } from "../monitoring";

const OPERATION_LATENCY_PROPERTY: JsonProperty = "$.latency";
const OPERATION_NAME_PROPERTY: JsonProperty = "$.operationName";
const USER_ID_PROPERTY: JsonProperty = "$.userId";
const END_OPERATION_FILTER: Filter = {
  match: "$.message",
  type: "In",
  value: ["Operation threw an error", "Response from operation had an error", "Successfully performed operation"],
};

type ContributorInsightsOperationRuleIds =
  `customersOf${(typeof OPERATIONS)[keyof typeof OPERATIONS]}By${"NumRequests" | "ComputeTimeConsumed"}`;

type ContributorInsightsRuleIds =
  | "customersByNumRequests"
  | "customersByComputeTimeConsumed"
  | "customersByNumRequestsPerOperation"
  | "customersByComputeTimeConsumedPerOperation"
  | ContributorInsightsOperationRuleIds;

/**
 * Properties for the {@link ApiLambda}.
 */
export interface ApiLambdaProps {
  /**
   * The stage this is deployed to.
   */
  readonly stage: Stage;

  /**
   * The VPC this Lambda function should execute in.
   */
  readonly vpc: IVpc;
}

/**
 * A construct representing our API Lambda function.
 */
export class ApiLambda extends Function implements Monitorable {
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
  private readonly _apiLogGroup: LogGroup<ContributorInsightsRuleIds>;

  public constructor(scope: Construct, { stage, vpc }: ApiLambdaProps) {
    const id = "ApiLambda";

    const logGroup = new LogGroup<ContributorInsightsRuleIds>(scope, `${id}Logs`, {
      contributorPrefix: "Api",
      contributors: {
        customersByNumRequests: { aggregateOn: "Count", contributorKeys: [USER_ID_PROPERTY], filters: [END_OPERATION_FILTER] },
        customersByComputeTimeConsumed: {
          aggregateOn: "Sum",
          valueOf: OPERATION_LATENCY_PROPERTY,
          contributorKeys: [USER_ID_PROPERTY],
          filters: [END_OPERATION_FILTER],
        },
        customersByNumRequestsPerOperation: {
          aggregateOn: "Count",
          contributorKeys: [USER_ID_PROPERTY, OPERATION_NAME_PROPERTY],
          filters: [END_OPERATION_FILTER],
        },
        customersByComputeTimeConsumedPerOperation: {
          aggregateOn: "Sum",
          valueOf: OPERATION_LATENCY_PROPERTY,
          contributorKeys: [USER_ID_PROPERTY, OPERATION_NAME_PROPERTY],
          filters: [END_OPERATION_FILTER],
        },
        ...Object.values(OPERATIONS).reduce(
          (output, operation) => {
            output[`customersOf${operation}ByComputeTimeConsumed`] = {
              aggregateOn: "Sum",
              valueOf: OPERATION_LATENCY_PROPERTY,
              contributorKeys: [USER_ID_PROPERTY],
              filters: [END_OPERATION_FILTER, { match: OPERATION_NAME_PROPERTY, type: "In", value: [`${operation}Procedure`] }],
            };

            output[`customersOf${operation}ByNumRequests`] = {
              aggregateOn: "Count",
              contributorKeys: [USER_ID_PROPERTY],
              filters: [END_OPERATION_FILTER, { match: OPERATION_NAME_PROPERTY, type: "In", value: [`${operation}Procedure`] }],
            };

            return output;
          },
          {} as Record<ContributorInsightsOperationRuleIds, ContributorInsightsRulePropsWithoutLogGroup>,
        ),
      },
      fieldsToIndex: ["cold_start", "function_request_id", "level", "message", "operationName", "procedureName", "userId", "xray_trace_id"],
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
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole")],
    });

    super(scope, id, {
      allowAllOutbound: true,
      applicationLogLevelV2: ApplicationLogLevel.INFO,
      architecture: Architecture.ARM_64,
      code: new AssetCode("build/api-lambda"),
      description: "The Lambda function responsible for hosting our website's API.",
      environment: {
        // Ensures any logic that has env conditional logic runs in production mode
        NODE_ENV: "production",
        // Enables NodeJS to leverage our source map when presenting error stack traces
        NODE_OPTIONS: "--enable-source-maps",
      },
      environmentEncryption,
      functionName: id,
      handler: "index.handler",
      insightsVersion: LambdaInsightsVersion.VERSION_1_0_404_0,
      logGroup,
      loggingFormat: LoggingFormat.JSON,
      memorySize: 512,
      role,
      runtime: Runtime.NODEJS_22_X,
      systemLogLevelV2: SystemLogLevel.INFO,
      timeout: MAX_LAMBDA_FUNCTION_URL_READ_TIMEOUT,
      tracing: Tracing.ACTIVE,
      vpc,
    });

    // Allows other constructs to reference these generated artifacts.
    this._apiLogGroup = logGroup;
    this.role = role;

    // Adds the function alias that points at the latest code and the function URL which points to that alias.
    this.alias = this.addAlias("Live", {
      description:
        "The primary alias for this Lambda function that points at the latest version of this function's code. All integrations should point to this alias.",
      provisionedConcurrentExecutions: isProd(stage) ? 2 : undefined,
    });
    this.url = this.alias.addFunctionUrl({ authType: FunctionUrlAuthType.AWS_IAM });

    const { account } = Stack.of(this);

    /**
     * Grants permissions for CloudFront distributions in this account to invoke this.
     *
     * We do not have access to the actual distribution id to create a more least privileged policy.
     *
     * We cannot create this after creating the distribution given the Lambdas live in a different region and doing so yields these errors:
     *
     * > Functions from 'us-west-1' are not reachable in this region ('us-east-1')
     */
    this.url.grantInvokeUrl(
      new ServicePrincipal("cloudfront.amazonaws.com", {
        conditions: { ArnLike: { ["aws:SourceArn"]: `arn:aws:cloudfront::${account}:distribution/*` } },
      }),
    );
  }

  /**
   * The encrypted log group that this Lambda writes to.
   */
  public override get logGroup(): LogGroup<ContributorInsightsRuleIds> {
    return this._apiLogGroup;
  }

  public addMonitoring(monitoring: MonitoringFacade): void {
    const { region } = Stack.of(this);

    monitoring.monitorLambdaFunction({
      humanReadableName: `API (${region})`,
      isIterator: false,
      lambdaFunction: this,
      lambdaInsightsEnabled: true,
      region,
    });

    const metricFactory = monitoring.createMetricFactory();

    monitoring
      .addSmallHeader("Top Customers")
      .addWidget(
        new Row(
          this.logGroup.contributors.customersByNumRequests.getWidget({ title: "By Number of Requests", units: "Requests" }),
          this.logGroup.contributors.customersByComputeTimeConsumed.getWidget({ title: "By Compute Time Consumed", units: "Milliseconds" }),
        ),
        false,
      )
      .addWidget(
        new Row(
          this.logGroup.contributors.customersByNumRequestsPerOperation.getWidget({
            title: "By Number of Requests Per Operation",
            units: "Requests",
          }),
          this.logGroup.contributors.customersByComputeTimeConsumedPerOperation.getWidget({
            title: "By Compute Time Consumed Per Operation",
            units: "Milliseconds",
          }),
        ),
        false,
      );

    const getOperationMetric = (operation: string, metricName: string, statistic: MetricStatistic, label: string) =>
      metricFactory.createMetric(
        metricName,
        statistic,
        label,
        { Operation: operation, service: "API" },
        undefined,
        "API",
        undefined,
        region,
      );

    // Adds procedure metrics
    Object.values(OPERATIONS).forEach((procedure) => {
      const operation = `${procedure}Procedure`;

      monitoring.monitorCustom({
        addToSummaryDashboard: false,
        alarmFriendlyName: `${procedure} Procedure`,
        metricGroups: [
          {
            title: "Requests",
            metrics: [getOperationMetric(operation, "Count", MetricStatistic.SUM, "Requests (total: ${SUM})")],
          },
          {
            title: "Latency",
            graphWidgetAxis: { min: 0 },
            metrics: [
              getOperationMetric(operation, "Latency", MetricStatistic.P50, "P50 (avg: ${AVG})"),
              getOperationMetric(operation, "Latency", MetricStatistic.P90, "P90 (avg: ${AVG})"),
              getOperationMetric(operation, "Latency", MetricStatistic.P99, "P99 (avg: ${AVG})"),
            ],
          },
          {
            title: "Errors",
            graphWidgetAxis: { label: "Count", min: 0, showUnits: false },
            metrics: [getOperationMetric(operation, "Failure", MetricStatistic.SUM, "Errors (total: ${SUM})")],
          },
        ],
      });

      monitoring.addWidget(
        new Row(
          this.logGroup.contributors[`customersOf${procedure}ByNumRequests`].getWidget({
            title: "Top Customers (By Number of Requests)",
            units: "Requests",
          }),
          this.logGroup.contributors[`customersOf${procedure}ByComputeTimeConsumed`].getWidget({
            title: "Top Customers (By Compute Time Consumed)",
            units: "Milliseconds",
          }),
        ),
        false,
      );
    });
  }
}
