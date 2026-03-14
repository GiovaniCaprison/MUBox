import { AccountPrincipal, CompositePrincipal, type IPrincipal, PolicyDocument, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { CrossAccountZoneDelegationRecord, type IPublicHostedZone, PublicHostedZone, TxtRecord } from "aws-cdk-lib/aws-route53";
import { Stack } from "aws-cdk-lib/core";
import { MonitoringFacade } from "cdk-monitoring-constructs";
import type { Construct } from "constructs";

import { isProd } from "./pipeline";
import { ACCOUNTS, APP_NAME, DOMAINS, HUMANIZED_STAGE_NAMES } from "../../constants";
import { DeploymentStack, type DeploymentStackProps, Route53DnsQueryLogs } from "../../constructs";
import { type DomainConfiguration, type Monitorable, Stage } from "../../types";

/**
 * Configuration options for the Route53HostedZoneStack.
 */
export type Route53HostedZoneStackProps = DeploymentStackProps & DomainConfiguration;

/**
 * **WARNING**
 *
 * This stack manages Route 53 hosted zone infrastructure for the website.
 * In prod, this stack imports the existing hosted zone that was created when the domain was
 * registered via the Route 53 registrar — it does NOT create a new one.
 * In beta, this stack creates a new hosted zone for the beta subdomain and sets up
 * cross-account delegation to the prod hosted zone.
 *
 * Updates to this stack should be handled **very** carefully.
 */
export class Route53HostedZoneStack extends DeploymentStack implements Monitorable {
  /**
   * The Route 53 hosted zone managed by this stack.
   *
   * In prod this is an imported reference to the existing hosted zone created by the Route 53
   * registrar. In beta this is a newly created hosted zone.
   */
  public readonly hostedZone: IPublicHostedZone;

  /**
   * The Route 53 DNS query logs.
   */
  public readonly queryLogs: Route53DnsQueryLogs;

  /**
   * The name of the IAM role used for cross-account DNS delegation.
   */
  private readonly CROSS_ACCOUNT_ROUTE_53_HOSTED_ZONE_DELEGATION_ROLE_NAME = "CrossAccountRoute53HostedZoneDelegationRole";

  public constructor(scope: Construct, props: Route53HostedZoneStackProps) {
    const { domainName, existingHostedZoneId, hasRoute53HostedZoneBeenDelegatedTo, ...deploymentStackProps } = props;
    super(scope, "Route53HostedZoneStack", deploymentStackProps);

    /**
     * A boolean representing whether or not this account is the production stage.
     */
    const isProdStage: boolean = isProd(this.stage);

    /**
     * The encrypted log group and associated infrastructure where we will store DNS query logs that our Route 53 hosted zone received.
     */
    this.queryLogs = new Route53DnsQueryLogs(this, "Route53DnsQueryLogs");

    if (existingHostedZoneId) {
      /**
       * In prod the hosted zone already exists — it was automatically created by Route 53 when the
       * domain was registered via the registrar. We import it here so CDK can add records and
       * create the cross-account delegation role, without attempting to create a duplicate zone.
       */
      this.hostedZone = PublicHostedZone.fromPublicHostedZoneAttributes(this, "WebsiteHostedZone", {
        hostedZoneId: existingHostedZoneId,
        zoneName: domainName,
      });

      /**
       * Query logging for an imported hosted zone cannot be configured with a standalone
       * CloudFormation resource in this stack. PublicHostedZone supports query logging only when
       * creating the zone (see the non-prod branch below).
       */
    } else {
      /**
       * In non-prod stages we create the hosted zone from scratch.
       */
      const newZone = new PublicHostedZone(this, "WebsiteHostedZone", {
        comment: `The hosted zone containing DNS records for the ${HUMANIZED_STAGE_NAMES[this.stage]} stage of the ${APP_NAME} website.`,
        queryLogsLogGroupArn: this.queryLogs.logGroupArn,
        zoneName: domainName,
      });

      /**
       * Ensures the hosted zone is only created after the permissions have been added to allow it to write to the DNS query logs.
       *
       * If this does not occur, deployments can fail with a "InsufficientCloudWatchLogsResourcePolicyException" error.
       */
      newZone.node.addDependency(this.queryLogs.route53PermissionsGrant);
      this.hostedZone = newZone;
    }

    /**
     * Adds email spoofing protection records to the hosted zone.
     */
    new TxtRecord(this, "SpfRecord", {
      comment: "Instructs email servers to block emails originating from this domain to prevent email spoofing.",
      values: ["v=spf1 -all"],
      zone: this.hostedZone,
    });
    new TxtRecord(this, "DmarcRecord", {
      comment: "Instructs email servers to reject spoofed emails originating from this domain.",
      recordName: "_dmarc",
      values: ["v=DMARC1; p=reject"],
      zone: this.hostedZone,
    });

    if (isProdStage) {
      /**
       * Creates a cross account delegation role that non-prod accounts will assume in order to allow non-prod accounts to be able create records
       * in the prod account to delegate their hosted zones.
       */
      new Role(this, this.CROSS_ACCOUNT_ROUTE_53_HOSTED_ZONE_DELEGATION_ROLE_NAME, {
        assumedBy: Route53HostedZoneStack.createIAMPrincipalForCrossAccountDelegation(),
        description: "The role used by non-prod accounts to perform DNS delegation to their hosted zones.",
        roleName: this.CROSS_ACCOUNT_ROUTE_53_HOSTED_ZONE_DELEGATION_ROLE_NAME,
        inlinePolicies: {
          GrantDnsDelegation: new PolicyDocument({
            statements: [
              // Allow changing hosted zone records but only for the records that should be allowed to be changed.
              new PolicyStatement({
                actions: ["route53:ChangeResourceRecordSets"],
                resources: [this.hostedZone.hostedZoneArn],
                conditions: {
                  "ForAllValues:StringEquals": {
                    // Ensures that this role can only upsert or delete records which are the only actions required for managing delegations.
                    "route53:ChangeResourceRecordSetsActions": ["UPSERT", "DELETE"],
                    // Ensures that this role can only change the records we are going to delegate.
                    "route53:ChangeResourceRecordSetsNormalizedRecordNames": Object.entries(DOMAINS)
                      .filter(([stage]) => stage !== Stage.PROD) // eslint-disable-line @typescript-eslint/no-unsafe-enum-comparison -- These do overlap and it is safe.
                      .map(([, config]) => config.domainName),
                    // Ensures only NS (i.e. delegation) records can be managed.
                    "route53:ChangeResourceRecordSetsRecordTypes": ["NS"],
                  },
                },
              }),
              // Allow listing hosted zones by name which is required for hosted zone discovery
              new PolicyStatement({
                actions: ["route53:ListHostedZonesByName"],
                resources: ["*"],
              }),
            ],
          }),
        },
      });
    } else if (hasRoute53HostedZoneBeenDelegatedTo) {
      /**
       * This is the ARN of the cross account delegation role that lives in the production account.
       */
      const crossAccountRoute5HostedZoneDelegationRoleArn: string = Stack.of(this).formatArn({
        region: "", // IAM is global in each partition
        service: "iam",
        account: ACCOUNTS.MUBOX.PROD,
        resource: "role",
        resourceName: this.CROSS_ACCOUNT_ROUTE_53_HOSTED_ZONE_DELEGATION_ROLE_NAME,
      });

      /**
       * Creates the appropriate cross account zone delegation records which will use the cross-account
       * delegation role to automatically perform DNS delegation for this hosted zone.
       *
       * This should only be created whenever hasRoute53HostedZoneBeenDelegatedTo is set given a deployment must
       * occur to production in order to set up the IAM principal that grants this logic permissions
       * to create the delegation.
       */
      new CrossAccountZoneDelegationRecord(this, "CrossAccountZoneDelegationRecord", {
        delegationRole: Role.fromRoleArn(
          this,
          this.CROSS_ACCOUNT_ROUTE_53_HOSTED_ZONE_DELEGATION_ROLE_NAME,
          crossAccountRoute5HostedZoneDelegationRoleArn,
        ),
        delegatedZone: this.hostedZone,
        parentHostedZoneName: DOMAINS.PROD.domainName,
      });
    }
  }

  public addMonitoring(monitoring: MonitoringFacade): void {
    const { region } = Stack.of(this);

    const route53HostedZoneUrl = monitoring
      .createAwsConsoleUrlFactory()
      .getAwsConsoleUrl(
        `https://${region}.console.aws.amazon.com/route53/v2/hostedzones?region=${region}#ListRecordSets/${this.hostedZone.hostedZoneId}`,
      );

    monitoring.addSmallHeader(`Route 53 Hosted Zone [${this.hostedZone.zoneName}](${route53HostedZoneUrl})`, false);

    this.queryLogs.addMonitoring(monitoring);
  }

  /**
   * Creates the IAM principal for cross-account DNS delegation to all non-production accounts.
   *
   * @returns The IPrincipal for cross-account DNS delegation
   */
  private static createIAMPrincipalForCrossAccountDelegation(): IPrincipal {
    return new CompositePrincipal(
      ...Object.values(Stage)
        .filter((stage) => !isProd(stage))
        .map((stage) => new AccountPrincipal(ACCOUNTS.MUBOX[stage])),
    );
  }
}
