import { Row } from "aws-cdk-lib/aws-cloudwatch";
import { CfnLoggingConfiguration, CfnWebACL } from "aws-cdk-lib/aws-wafv2";
import { MonitoringFacade } from "cdk-monitoring-constructs";
import { Construct } from "constructs";

import type { Monitorable } from "../../types";
import { LogGroup } from "../monitoring";

/**
 * A construct that sets up a Web Application Firewall (WAF) Access Control List (ACL) to protect the Website construct.
 */
export class WebsiteFirewall extends CfnWebACL implements Monitorable {
  public readonly logs: LogGroup<
    "ipAddresses" | "requests" | "countries" | "ja4Fingerprints" | "terminatingRules" | "terminatingRulesByJa4Fingerprint"
  >;

  public constructor(parent: Construct, id: string) {
    let priority = 0;

    /**
     * The visibility configuration for a given rule.
     */
    const getVisibilityConfig = (ruleName: string): CfnWebACL.VisibilityConfigProperty => ({
      cloudWatchMetricsEnabled: true,
      metricName: `${id}${ruleName}`,
      sampledRequestsEnabled: true,
    });

    /**
     * Gets the rule property for an AWS managed rule.
     */
    const getManagedRuleProperty = (
      ruleName: string,
      overrides: {
        readonly excludedRules?: CfnWebACL.ExcludedRuleProperty[];
        readonly managedRuleGroupConfigs?: CfnWebACL.ManagedRuleGroupConfigProperty[];
      } = {},
    ): CfnWebACL.RuleProperty => ({
      priority: priority++,
      name: `${id}${ruleName}`,
      overrideAction: { none: {} },
      visibilityConfig: getVisibilityConfig(ruleName),
      statement: {
        managedRuleGroupStatement: {
          vendorName: "AWS",
          name: `AWSManagedRules${ruleName}`,
          excludedRules: overrides.excludedRules,
          managedRuleGroupConfigs: overrides.managedRuleGroupConfigs,
        },
      },
    });

    /**
     * Gets the rule property for a rate based rule.
     */
    const getRateLimitRuleProperty = (
      rateLimitType: string,
      rateBasedStatement: CfnWebACL.RateBasedStatementProperty,
    ): CfnWebACL.RuleProperty => ({
      name: `${id}${rateLimitType}RateLimitRule`,
      action: { block: {} },
      priority: priority++,
      statement: { rateBasedStatement },
      visibilityConfig: getVisibilityConfig(`${rateLimitType}RateLimitRule`),
    });

    const rules: CfnWebACL.RuleProperty[] = [
      /**
       * Docs:
       *
       * @see https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-anti-ddos.html
       *
       * This DDoS rule is recommended to always be first
       *
       * @see https://docs.aws.amazon.com/waf/latest/developerguide/waf-managed-protections-best-practices.html
       */
      getManagedRuleProperty("AntiDDoSRuleSet", {
        managedRuleGroupConfigs: [
          {
            awsManagedRulesAntiDDoSRuleSet: {
              // Disable the two browser-challenge rules entirely.
              clientSideActionConfig: { challenge: { usageOfAction: "DISABLED" } },
              // Block all suspicious traffic.
              sensitivityToBlock: "HIGH",
            },
          },
        ],
      }),
      // Docs https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html#aws-managed-rule-groups-baseline-known-bad-inputs
      getManagedRuleProperty("KnownBadInputsRuleSet"),
      // Docs https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html#aws-managed-rule-groups-baseline-crs
      getManagedRuleProperty("CommonRuleSet", {
        // Internal API's regularly expect large inputs
        excludedRules: [{ name: "SizeRestrictions_BODY" }],
      }),
      // Docs https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-use-case.html#aws-managed-rule-groups-use-case-linux-os
      getManagedRuleProperty("LinuxRuleSet"),
      // Docs https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-use-case.html#aws-managed-rule-groups-use-case-posix-os
      getManagedRuleProperty("UnixRuleSet"),
      // Docs https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html#aws-managed-rule-groups-baseline-admin
      getManagedRuleProperty("AdminProtectionRuleSet"),
      // Docs https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-ip-rep.html#aws-managed-rule-groups-ip-rep-amazon
      getManagedRuleProperty("AmazonIpReputationList"),
      // Docs https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-ip-rep.html#aws-managed-rule-groups-ip-rep-anonymous
      getManagedRuleProperty("AnonymousIpList"),
      /**
       * Rate limit both on JA4 fingerprints for classes of clients as well as individual IP addresses.
       *
       * Docs https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-aggregation-options.html
       */
      getRateLimitRuleProperty("JA4", {
        aggregateKeyType: "CUSTOM_KEYS",
        /**
         * If there is insufficient TSL Client Hello information to compute the JA4 fingerprint,
         * then treat the web request as not matching the rule statement (i.e: ignore)
         */
        customKeys: [{ ja4Fingerprint: { fallbackBehavior: "NO_MATCH" } }],
        limit: 1_500, // 25 TPS - JA4 fingerprints represent entire classes of clients hence higher value
        evaluationWindowSec: 60,
      }),
      getRateLimitRuleProperty("IP", {
        aggregateKeyType: "IP",
        limit: 300, // 5 TPS
        evaluationWindowSec: 60,
      }),
    ];

    super(parent, id, {
      defaultAction: { allow: {} },
      description: "The firewall used to help protect the website",
      name: `${parent.node.id}${id}`,
      rules,
      scope: "CLOUDFRONT",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: id,
        sampledRequestsEnabled: true,
      },
    });

    /**
     * Sets up CloudWatch logging for WAF.
     *
     * The log group must be prefixed with `aws-waf-logs-`
     *
     * @see https://docs.aws.amazon.com/waf/latest/developerguide/logging-cw-logs.html#logging-cw-logs-naming
     */
    this.logs = new LogGroup(this, `aws-waf-logs-${id}`, {
      contributorPrefix: "Firewall",
      contributors: {
        countries: { aggregateOn: "Count", contributorKeys: ["$.httpRequest.country"] },
        ipAddresses: { aggregateOn: "Count", contributorKeys: ["$.httpRequest.clientIp"] },
        ja4Fingerprints: { aggregateOn: "Count", contributorKeys: ["$.ja4Fingerprint"] },
        terminatingRules: { aggregateOn: "Count", contributorKeys: ["$.action", "$.terminatingRuleId"] },
        terminatingRulesByJa4Fingerprint: {
          aggregateOn: "Count",
          contributorKeys: ["$.action", "$.terminatingRuleId", "$.ja4Fingerprint"],
        },
        requests: { aggregateOn: "Count", contributorKeys: ["$.httpRequest.httpMethod", "$.httpRequest.uri"] },
      },
      fieldsToIndex: [
        "action",
        "httpRequest.args",
        "httpRequest.clientIp",
        "httpRequest.country",
        "httpRequest.fragment",
        "httpRequest.httpMethod",
        "httpRequest.httpVersion",
        "httpRequest.requestId",
        "httpRequest.scheme",
        "httpRequest.uri",
        "ja4Fingerprint",
        "terminatingRuleId",
        "terminatingRuleType",
      ],
    });

    new CfnLoggingConfiguration(this, "WafLoggingConfiguration", {
      logDestinationConfigs: [this.logs.logGroupArn],
      // Ensures sensitive request information is not logged.
      redactedFields: [{ singleHeader: { Name: "cookie" } }],
      resourceArn: this.attrArn,
    });
  }

  public addMonitoring(monitoring: MonitoringFacade): void {
    monitoring.monitorWebApplicationFirewallAclV2({ acl: this });

    monitoring.addWidget(
      new Row(
        this.logs.contributors.terminatingRules.getWidget({ title: "Terminating Rules", units: "Count" }),
        this.logs.contributors.terminatingRulesByJa4Fingerprint.getWidget({
          title: "Terminating Rules By JA4 Fingerprint",
          units: "Count",
        }),
      ),
      false,
    );
  }
}
