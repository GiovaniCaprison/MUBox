import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { Row } from "aws-cdk-lib/aws-cloudwatch";
import { CfnDelivery, CfnDeliveryDestination, CfnDeliverySource } from "aws-cdk-lib/aws-logs";
import { MonitoringFacade } from "cdk-monitoring-constructs";

import { LogGroup } from "./log-group";
import type { Monitorable } from "../../../types";

/**
 * A construct containing infrastructure for creating CloudFront access logs including:
 *
 * * The CloudWatch log group
 * * The CloudWatch delivery source from the provided CloudFront distribution.
 * * The CloudWatch delivery destination that points at the log group.
 * * The CloudWatch delivery which links the delivery source and destination.
 *
 * This is not yet natively supported in CDK. Once they launch support natively, we should update this.
 *
 * @see https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/2204
 * @see https://github.com/aws/aws-cdk/issues/32279
 */
export class CloudFrontDistributionAccessLogs
  extends LogGroup<
    "edgeLocations" | "edgeLocationStatus" | "edgeLocationVolumeBytes" | "ipAddresses" | "referrers" | "requests" | "requestFailures"
  >
  implements Monitorable
{
  /**
   * The CloudWatch delivery which links the delivery source and destination.
   */
  public readonly delivery: CfnDelivery;

  /**
   * The CloudWatch delivery destination that points at the log group.
   */
  public readonly deliveryDestination: CfnDeliveryDestination;

  /**
   * The CloudWatch delivery source from the provided CloudFront distribution.
   */
  public readonly deliverySource: CfnDeliverySource;

  constructor(distribution: Distribution) {
    const id = `${distribution.node.id}AccessLogs`;
    super(distribution, id, {
      contributorPrefix: "CloudFront",
      contributors: {
        edgeLocations: { aggregateOn: "Count", contributorKeys: ["$.x-edge-location"] },
        edgeLocationStatus: { aggregateOn: "Count", contributorKeys: ["$.x-edge-location", "$.sc-status"] },
        edgeLocationVolumeBytes: { aggregateOn: "Sum", contributorKeys: ["$.x-edge-location"], valueOf: "$.sc-bytes" },
        ipAddresses: { aggregateOn: "Count", contributorKeys: ["$.c-ip"] },
        referrers: { aggregateOn: "Count", contributorKeys: ["$.cs(Referer)"] },
        requests: { aggregateOn: "Count", contributorKeys: ["$.cs-method", "$.cs-uri-stem"] },
        requestFailures: {
          aggregateOn: "Count",
          contributorKeys: ["$.cs-method", "$.cs-uri-stem"],
          filters: [{ match: "$.x-edge-result-type", type: "In", value: ["Error"] }],
        },
      },
      fieldsToIndex: [
        "c-ip",
        "cs(Referer)",
        "cs(User-Agent)",
        "cs-method",
        "cs-protocol",
        "cs-protocol-version",
        "cs-uri-query",
        "cs-uri-stem",
        "sc-status",
        "ssl-cipher",
        "ssl-protocol",
        "x-edge-location",
        "x-edge-request-id",
        "x-edge-response-result-type",
        "x-edge-result-type",
        "x-host-header",
      ],
    });

    const deliverySourceName = `${id}DeliverySource`;
    this.deliverySource = new CfnDeliverySource(this, deliverySourceName, {
      name: deliverySourceName,
      logType: "ACCESS_LOGS",
      resourceArn: distribution.distributionArn,
    });

    const deliveryDestinationName = `${id}DeliveryDestination`;
    this.deliveryDestination = new CfnDeliveryDestination(this, deliveryDestinationName, {
      name: deliveryDestinationName,
      destinationResourceArn: this.logGroupArn,
      outputFormat: "json",
    });

    this.delivery = new CfnDelivery(this, `${id}Delivery`, {
      deliverySourceName: this.deliverySource.name,
      deliveryDestinationArn: this.deliveryDestination.attrArn,
    });

    // Ensures that the delivery is only setup after the delivery source is fully set up given there is not an implicit dependency between them.
    this.delivery.node.addDependency(this.deliverySource);
  }

  public addMonitoring(monitoring: MonitoringFacade): void {
    monitoring
      .addWidget(
        new Row(
          this.contributors.requests.getWidget({ title: "Requests", units: "Requests" }),
          this.contributors.requestFailures.getWidget({ title: "Request Failures", units: "Failures" }),
        ),
        false,
      )
      .addWidget(
        new Row(
          this.contributors.edgeLocations.getWidget({ title: "Edge Locations", units: "Requests" }),
          this.contributors.edgeLocationVolumeBytes.getWidget({ title: "Edge Location Volume", units: "Bytes Served" }),
        ),
        false,
      );
  }
}
