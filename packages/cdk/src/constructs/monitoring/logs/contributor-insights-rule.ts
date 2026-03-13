import { CfnInsightRule } from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";

import { LogGroup } from "./log-group";
import { ContributorInsightsWidget, type ContributorInsightsWidgetProps } from "../dashboards";

/**
 * A type representing a JSON property.
 */
export type JsonProperty = `$.${string}`;

/**
 * The base representation of a filter for a contributor insights rule.
 */
interface BaseFilter<T extends string, V extends boolean | number | readonly string[]> {
  /**
   * The property to filter on.
   */
  readonly match: JsonProperty;

  /**
   * The type of filter.
   */
  readonly type: T;

  /**
   * The value to filter.
   */
  readonly value: V;
}

type BooleanFilter = BaseFilter<"IsPresent", boolean>;
type NumberFilter = BaseFilter<"GreaterThan" | "LessThan" | "EqualTo" | "NotEqualTo", number>;
type StringFilter = BaseFilter<"In" | "NotIn" | "StartsWith", readonly string[]>;

/**
 * Any filter which could be applied to logs to limit matches.
 */
export type Filter = BooleanFilter | NumberFilter | StringFilter;

/**
 * Common properties for the {@link ContributorInsightsRule}.
 */
interface BaseContributorInsightsRuleProps {
  /**
   * The log group whose logs this rule will run against.
   */
  readonly logGroup: LogGroup;

  /**
   * The keys to use for determining contributors.
   */
  readonly contributorKeys: readonly JsonProperty[];

  /**
   * Whether or not to apply this rule to transformed logs.
   *
   * @default false
   */
  readonly applyOnTransformedLogs?: boolean;

  /**
   * The filters to apply to the results.
   */
  readonly filters?: readonly Filter[];
}

/**
 * The properties for count aggregated {@link ContributorInsightsRule}'s.
 */
export interface CountContributorInsightsRuleProps extends BaseContributorInsightsRuleProps {
  /**
   * What this rule should aggregate on.
   */
  readonly aggregateOn: "Count";
}

/**
 * The properties for sum aggregated {@link ContributorInsightsRule}'s.
 */
export interface SumContributorInsightsRuleProps extends BaseContributorInsightsRuleProps {
  /**
   * What this rule should aggregate on.
   */
  readonly aggregateOn: "Sum";

  /**
   * The key whose property to take the sum of.
   */
  readonly valueOf: JsonProperty;
}

/**
 * Properties for the {@link ContributorInsightsRule}.
 */
export type ContributorInsightsRuleProps = CountContributorInsightsRuleProps | SumContributorInsightsRuleProps;

/**
 * An L2 construct for creating Contributor Insights rules.
 *
 * AWS should support this, but they haven't gotten to it https://github.com/aws/aws-cdk/issues/6255.
 */
export class ContributorInsightsRule extends CfnInsightRule {
  public constructor(scope: Construct, id: string, props: ContributorInsightsRuleProps) {
    const { aggregateOn, applyOnTransformedLogs, contributorKeys, filters, logGroup } = props;

    const contributionConfig: Record<string, unknown> = { Keys: contributorKeys };

    if (props.aggregateOn === "Sum") {
      contributionConfig.ValueOf = props.valueOf;
    }

    contributionConfig.Filters = filters ? filters.map(({ match, type, value }) => ({ Match: match, [type]: value })) : [];

    super(scope, id, {
      ruleName: id,
      ruleState: "ENABLED",
      // This schema is documented here https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContributorInsights-RuleSyntax.html
      ruleBody: JSON.stringify({
        Schema: {
          Name: "CloudWatchLogRule",
          Version: 1,
        },
        LogGroupARNs: [logGroup.arn],
        LogFormat: "JSON",
        AggregateOn: aggregateOn,
        Contribution: contributionConfig,
      }),
      applyOnTransformedLogs,
    });
  }

  /**
   * Gets the CloudWatch dashboard widget for this specific rule.
   */
  public getWidget(props: Omit<ContributorInsightsWidgetProps, "rule">) {
    return new ContributorInsightsWidget({ ...props, rule: this });
  }
}
