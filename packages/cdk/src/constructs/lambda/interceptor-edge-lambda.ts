import { LambdaEdgeEventType, type EdgeLambda } from "aws-cdk-lib/aws-cloudfront";
import { GraphWidget, Row } from "aws-cdk-lib/aws-cloudwatch";
import { CompositePrincipal, ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { ApplicationLogLevel, AssetCode, Function, LoggingFormat, Runtime, SystemLogLevel, Tracing, Version } from "aws-cdk-lib/aws-lambda";
import { MetricStatistic, MonitoringFacade } from "cdk-monitoring-constructs";
import { Construct } from "constructs";

import { MAX_VIEWER_REQUEST_EDGE_LAMBDA_DURATION } from "../../constants";
import type { Monitorable } from "../../types";
import { LogGroup, type Filter } from "../monitoring";

const AUTHENTICATED_REQUEST_FILTER: Filter = { match: "$.message.message", type: "In", value: ["Successfully authenticated request"] };

/**
 * The regions that CloudFront has edge caches where Lambda@Edge operates.
 *
 * Got this list from CloudFront Lambda@Edge monitoring page. I have not found official documentation on this list though.
 */
const EDGE_LAMBDA_REGIONS = [
  { id: "us-east-1", alias: "US-East (N. Virginia)" },
  { id: "us-east-2", alias: "US-East (Ohio)" },
  { id: "us-west-1", alias: "US-West (N. California)" },
  { id: "us-west-2", alias: "US-West (Oregon)" },
  { id: "ap-south-1", alias: "Asia Pacific (Mumbai)" },
  { id: "ap-northeast-1", alias: "Asia Pacific (Tokyo)" },
  { id: "ap-northeast-2", alias: "Asia Pacific (Seoul)" },
  { id: "ap-southeast-1", alias: "Asia Pacific (Singapore)" },
  { id: "ap-southeast-2", alias: "Asia Pacific (Sydney)" },
  { id: "eu-west-1", alias: "EU (Ireland)" },
  { id: "eu-west-2", alias: "EU (London)" },
  { id: "eu-central-1", alias: "EU (Frankfurt)" },
  { id: "sa-east-1", alias: "South America (Sao Paulo)" },
] as const;

/**
 * A construct representing our Interceptor Lambda@Edge function.
 */
export class InterceptorEdgeLambda extends Function implements EdgeLambda, Monitorable {
  public readonly eventType = LambdaEdgeEventType.VIEWER_REQUEST;
  public readonly functionVersion: Version;
  public readonly includeBody = false;

  public constructor(scope: Construct) {
    const id = "InterceptorEdgeLambda";

    const logGroup = new LogGroup(scope, `${id}Logs`, {
      contributorPrefix: "Interceptor",
      contributors: {
        requests: { aggregateOn: "Count", contributorKeys: ["$.message.method", "$.message.uri"], filters: [AUTHENTICATED_REQUEST_FILTER] },
        users: { aggregateOn: "Count", contributorKeys: ["$.message.requester"], filters: [AUTHENTICATED_REQUEST_FILTER] },
      },
      fieldsToIndex: ["level", "message.message", "message.method", "message.requester", "message.uri", "requestId", "record.requestId"],
    });

    const role = new Role(scope, `${id}Role`, {
      assumedBy: new CompositePrincipal(new ServicePrincipal("lambda.amazonaws.com"), new ServicePrincipal("edgelambda.amazonaws.com")),
      description: `The execution role for the ${id} Lambda@Edge function`,
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
    });

    super(scope, id, {
      applicationLogLevelV2: ApplicationLogLevel.INFO,
      code: new AssetCode("build/interceptor-edge-lambda"),
      description: "The Lambda@Edge function responsible for human authentication to the CloudFront distribution.",
      functionName: id,
      handler: "index.handler",
      logGroup,
      loggingFormat: LoggingFormat.JSON,
      memorySize: 128,
      role,
      runtime: Runtime.NODEJS_22_X,
      systemLogLevelV2: SystemLogLevel.INFO,
      timeout: MAX_VIEWER_REQUEST_EDGE_LAMBDA_DURATION,
      tracing: Tracing.ACTIVE,
    });

    this.functionVersion = this.currentVersion;
  }

  public addMonitoring(monitoring: MonitoringFacade): void {
    const functionName = this.node.id; // Use this static value instead of this.functionName which would create a intrinsic function reference

    const metricFactory = monitoring.createMetricFactory();
    const getMetric = (metricName: string, label: string, statistic: MetricStatistic, region: string) =>
      metricFactory.createMetric(
        metricName,
        statistic,
        label,
        { FunctionName: `us-east-1.${functionName}` }, // Lambda@Edge metrics include a `us-east-1.` prefix
        undefined,
        "AWS/Lambda",
        undefined,
        region,
      );

    monitoring.addSmallHeader(
      `Lambda@Edge Function [${functionName}](${monitoring.createAwsConsoleUrlFactory().getLambdaFunctionUrl(functionName)})`,
      true,
    );

    EDGE_LAMBDA_REGIONS.forEach((region) => {
      monitoring.addWidget(
        new Row(
          new GraphWidget({
            title: `${region.alias} Latency`,
            left: [
              getMetric("Duration", "P50 (avg: ${AVG})", MetricStatistic.P50, region.id),
              getMetric("Duration", "P90 (avg: ${AVG})", MetricStatistic.P90, region.id),
              getMetric("Duration", "P99 (avg: ${AVG})", MetricStatistic.P99, region.id),
              getMetric("Duration", "Max (avg: ${AVG})", MetricStatistic.MAX, region.id),
            ],
            leftYAxis: { label: "Milliseconds", showUnits: false },
            region: region.id,
            height: 5,
            width: 8,
          }),
          new GraphWidget({
            title: `${region.alias} Invocations`,
            left: [
              getMetric("Invocations", "Invocations (sum: ${SUM})", MetricStatistic.SUM, region.id),
              getMetric("Throttles", "Throttles (sum: ${SUM})", MetricStatistic.SUM, region.id),
              getMetric("ConcurrentExecutions", "Concurrent Executions (max: ${MAX})", MetricStatistic.MAX, region.id),
            ],
            leftYAxis: { label: "Count", showUnits: false },
            region: region.id,
            height: 5,
            width: 8,
          }),
          new GraphWidget({
            title: `${region.alias} Errors`,
            left: [getMetric("Errors", "Errors (sum: ${SUM})", MetricStatistic.SUM, region.id)],
            leftYAxis: { label: "Count", showUnits: false },
            region: region.id,
            height: 5,
            width: 8,
          }),
        ),
        true,
      );
    });
  }
}
