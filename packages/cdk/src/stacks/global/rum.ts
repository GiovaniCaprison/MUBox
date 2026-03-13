import { Row } from "aws-cdk-lib/aws-cloudwatch";
import { MonitoringFacade } from "cdk-monitoring-constructs";
import type { Construct } from "constructs";

import { APP_NAME, DOMAINS } from "../../constants";
import { DeploymentStack, type DeploymentStackProps, LogGroup, RumAppMonitor, RumLambda } from "../../constructs";
import type { Monitorable } from "../../types";

/**
 * A CloudFormation stack that deploys the RUM (Real User Monitoring) infrastructure including the CloudWatch application monitor and log group.
 */
export class RumStack extends DeploymentStack implements Monitorable {
  /**
   * The RUM application monitor.
   */
  public readonly appMonitor: RumAppMonitor;

  /**
   * The log group containing the RUM logs.
   */
  public readonly logs: LogGroup<"browserLanguages" | "devices" | "deviceTypes" | "timeDownloadingResources">;

  /**
   * The lambda function responsible for processing RUM events.
   */
  public readonly lambda: RumLambda;

  public constructor(scope: Construct, stackProps: DeploymentStackProps) {
    super(scope, "RumStack", stackProps);

    // Sets up real user monitoring
    this.appMonitor = new RumAppMonitor(this, "WebsiteAppMonitor", { domain: DOMAINS[this.stage].domainName, name: APP_NAME });
    this.logs = new LogGroup(this, "RumLogs", {
      contributorPrefix: "User",
      contributors: {
        browserLanguages: { aggregateOn: "Count", contributorKeys: ["$.metadata.browserLanguage"] },
        devices: { aggregateOn: "Count", contributorKeys: ["$.metadata.osName", "$.metadata.browserName"] },
        deviceTypes: { aggregateOn: "Count", contributorKeys: ["$.metadata.deviceType"] },
        timeDownloadingResources: {
          aggregateOn: "Sum",
          contributorKeys: ["$.details.fileType", "$.details.targetUrl"],
          filters: [{ match: "$.type", type: "In", value: ["com.amazon.rum.performance_resource_event"] }],
          valueOf: "$.details.duration",
        },
      },
      fieldsToIndex: [
        "id",
        "details.initiatorType",
        "details.interaction",
        "details.navigationType",
        "details.pageId",
        "details.pageInteractionId",
        "details.parentPageInteractionId",
        "details.request.url",
        "details.request.method",
        "details.response.status",
        "details.segment_id",
        "details.targetUrl",
        "details.trace_id",
        "metadata.browserLanguage",
        "metadata.browserName",
        "metadata.deviceType",
        "metadata.osName",
        "metadata.pageId",
        "metadata.platformType",
        "type",
      ],
    });

    // Creates the Lambda function responsible for processing the RUM events.
    this.lambda = new RumLambda(this, { rumAppMonitor: this.appMonitor, rumLogs: this.logs });
  }

  public addMonitoring(monitoring: MonitoringFacade): void {
    this.appMonitor.addMonitoring(monitoring);

    monitoring.addWidget(
      new Row(
        this.logs.contributors.deviceTypes.getWidget({ title: "Client Category", units: "Count" }),
        this.logs.contributors.devices.getWidget({ title: "Client", units: "Count" }),
      ),
      false,
    );

    this.lambda.addMonitoring(monitoring);
  }
}
