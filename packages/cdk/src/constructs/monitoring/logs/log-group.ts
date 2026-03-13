import { AccountRootPrincipal, PolicyDocument, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Key } from "aws-cdk-lib/aws-kms";
import { FieldIndexPolicy, LogGroup as BaseLogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { RemovalPolicy, Stack } from "aws-cdk-lib/core";
import { Construct } from "constructs";

import {
  ContributorInsightsRule,
  type CountContributorInsightsRuleProps,
  type SumContributorInsightsRuleProps,
} from "./contributor-insights-rule";
import { LogGroupAnomalyDetector } from "./log-group-anomaly-detector";

/**
 * Properties for Contributor Insights rules without the `logGroup` property.
 */
export type ContributorInsightsRulePropsWithoutLogGroup =
  | Omit<CountContributorInsightsRuleProps, "logGroup">
  | Omit<SumContributorInsightsRuleProps, "logGroup">;

/**
 * Properties for the {@link LogGroup} construct.
 *
 * @typeParam RuleIds - The rule ids for the provided contributors. This type information is used to provide type-safe access to the generated
 *   {@link ContributorInsightsRule}'s.
 */
export interface LogGroupProps<RuleIds extends string = never> {
  /**
   * The prefix for the Contributor Insights rules ids and names.
   */
  readonly contributorPrefix: string;

  /**
   * The contributors that most impact system performance in these logs.
   *
   * This is used to generate Contributor Insights rules.
   *
   * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContributorInsights.html
   */
  readonly contributors: Record<RuleIds, ContributorInsightsRulePropsWithoutLogGroup>;

  /**
   * Fields within this log group to automatically index for improved query performance when using CloudWatch Log Insights.
   *
   * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CloudWatchLogs-Field-Indexing.html
   */
  readonly fieldsToIndex: string[];
}

/**
 * A log group with a dedicated customer-managed KMS key and anomaly detection.
 */
export class LogGroup<RuleIds extends string = never> extends BaseLogGroup {
  /**
   * The anomaly detector for this log group.
   */
  public readonly anomalyDetector: LogGroupAnomalyDetector;

  /**
   * The ARN of the log group.
   *
   * This differs from the `logGroupArn` in that it excludes the trailing `:*` that `logGroupArn` includes.
   */
  public readonly arn: string;

  /**
   * The contributor insights rules that were created.
   */
  public readonly contributors: Record<RuleIds, ContributorInsightsRule>;

  /**
   * The key used to encrypt this log group.
   */
  public readonly encryptionKey: Key;

  public constructor(scope: Construct, logGroupName: string, { contributors, contributorPrefix, fieldsToIndex }: LogGroupProps<RuleIds>) {
    const { account, region } = Stack.of(scope);

    const arn = `arn:aws:logs:${region}:${account}:log-group:${logGroupName}`;

    /**
     * The KMS encryption key to use for encryption of this log group.
     */
    const encryptionKey = new Key(scope, `${logGroupName}EncryptionKey`, {
      alias: `${logGroupName}EncryptionKey`,
      enableKeyRotation: true,
      description: `The encryption key for ${logGroupName} log group`,

      /**
       * Documentation on this policy https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html#cmk-permissions
       */
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["kms:*"],
            principals: [new AccountRootPrincipal()], // Without this, we would never be able to update the key in the future
            resources: ["*"],
          }),
          new PolicyStatement({
            actions: ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"],
            conditions: {
              ArnEquals: { "kms:EncryptionContext:aws:logs:arn": arn },
            },
            principals: [new ServicePrincipal(`logs.${region}.amazonaws.com`)],
            resources: ["*"],
          }),
        ],
      }),
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    });

    super(scope, logGroupName, {
      encryptionKey,
      fieldIndexPolicies: [new FieldIndexPolicy({ fields: fieldsToIndex })],
      logGroupName,
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
      retention: RetentionDays.TEN_YEARS,
    });

    this.arn = arn;
    this.encryptionKey = encryptionKey;

    this.anomalyDetector = new LogGroupAnomalyDetector(this, `${logGroupName}AnomalyDetector`, { logGroup: this });

    const contributorIdAndProps = Object.entries(contributors) as [RuleIds, ContributorInsightsRulePropsWithoutLogGroup][];

    this.contributors = contributorIdAndProps.reduce(
      (output, [id, props]) => {
        output[id] = new ContributorInsightsRule(this, contributorPrefix + id.charAt(0).toUpperCase() + id.slice(1), {
          logGroup: this,
          ...props,
        });
        return output;
      },
      {} as Record<RuleIds, ContributorInsightsRule>,
    );
  }
}
