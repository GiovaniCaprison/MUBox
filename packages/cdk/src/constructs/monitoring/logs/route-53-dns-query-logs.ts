import { Row } from "aws-cdk-lib/aws-cloudwatch";
import { Grant, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Transformer, VendedLogParser, VendedLogType } from "aws-cdk-lib/aws-logs";
import { MonitoringFacade } from "cdk-monitoring-constructs";
import { Construct } from "constructs";

import { LogGroup } from "./log-group";
import type { Monitorable } from "../../../types";

/**
 * A construct containing infrastructure for creating Route 53 DNS query logs including:
 *
 * * The CloudWatch log group
 * * Permissions for Route 53 to write to the log group.
 * * A transformer to make the logs queryable in CloudWatch Log Insights.
 */
export class Route53DnsQueryLogs extends LogGroup<"edgeLocations" | "ipAddresses" | "queries" | "queryFailures"> implements Monitorable {
  /**
   * The permissions grant that allows Route 53 to write to this log group.
   *
   * Note that the hosted zone this is being added to must add an explicit dependency on this to avoid permissions issues.
   */
  public readonly route53PermissionsGrant: Grant;

  /**
   * The transformer to JSON-ify the DNS query logs.
   */
  public readonly transformer: Transformer;

  public constructor(scope: Construct, logGroupName: string) {
    super(scope, logGroupName, {
      contributorPrefix: "Route53Dns",
      contributors: {
        edgeLocations: { aggregateOn: "Count", applyOnTransformedLogs: true, contributorKeys: ["$.edgeLocation"] },
        ipAddresses: { aggregateOn: "Count", applyOnTransformedLogs: true, contributorKeys: ["$.resolverIp"] },
        queries: { aggregateOn: "Count", applyOnTransformedLogs: true, contributorKeys: ["$.protocol", "$.queryType", "$.queryName"] },
        queryFailures: {
          aggregateOn: "Count",
          applyOnTransformedLogs: true,
          contributorKeys: ["$.protocol", "$.queryType", "$.queryName", "$.responseCode"],
          filters: [{ match: "$.responseCode", type: "NotIn", value: ["NOERROR"] }],
        },
      },
      fieldsToIndex: ["edgeLocation", "hostZoneId", "protocol", "queryName", "queryType", "resolverIp", "responseCode"],
    });

    // Grants Route 53 permissions to write to the DNS query log group.
    this.route53PermissionsGrant = this.grantWrite(new ServicePrincipal("route53.amazonaws.com"));

    // Transforms the logs from flat log lines into more parsable JSON
    this.transformer = new Transformer(this, "Route53DnsQueryLogsTransformer", {
      transformerName: "Route53DnsQueryLogsTransformer",
      logGroup: this,
      transformerConfig: [new VendedLogParser({ logType: VendedLogType.ROUTE53 })],
    });
  }

  public addMonitoring(monitoring: MonitoringFacade): void {
    monitoring
      .addWidget(
        new Row(
          this.contributors.queries.getWidget({ title: "Queries", units: "Queries" }),
          this.contributors.queryFailures.getWidget({ title: "Query Failures", units: "Query Failures" }),
        ),
        false,
      )
      .addWidget(
        new Row(
          this.contributors.edgeLocations.getWidget({ title: "Edge Locations", units: "Queries" }),
          this.contributors.ipAddresses.getWidget({ title: "IP Addresses", units: "Queries" }),
        ),
        false,
      );
  }
}
