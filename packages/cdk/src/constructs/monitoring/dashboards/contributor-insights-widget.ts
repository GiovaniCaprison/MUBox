import { ConcreteWidget, LegendPosition, Stats } from "aws-cdk-lib/aws-cloudwatch";
import { Duration, Stack } from "aws-cdk-lib/core";

import { ContributorInsightsRule } from "../logs";

/**
 * Properties for the {@link ContributorInsightsWidget}.
 */
export interface ContributorInsightsWidgetProps {
  /**
   * Title for the widget.
   */
  readonly title: string;

  /**
   * The rule to display.
   */
  readonly rule: ContributorInsightsRule;

  /**
   * The units to display on the Y-axis.
   */
  readonly units: string;
}

/**
 * Displays the top 10 users of a provided {@link ContributorInsightsRule} on a dashboard.
 */
export class ContributorInsightsWidget extends ConcreteWidget {
  private readonly props: ContributorInsightsWidgetProps;

  constructor(props: ContributorInsightsWidgetProps) {
    super(12, 5);

    this.props = props;
  }

  public toJson(): unknown[] {
    const { region } = Stack.of(this.props.rule);

    return [
      {
        type: "metric",
        width: this.width,
        height: this.height,
        x: this.x,
        y: this.y,
        properties: {
          view: "timeSeries",
          title: this.props.title,
          period: Duration.minutes(5).toSeconds(),
          region,
          insightRule: {
            maxContributorCount: 10,
            orderBy: Stats.SUM,
            ruleName: this.props.rule.ruleName,
          },
          legend: { position: LegendPosition.RIGHT },
          yAxis: { left: { label: this.props.units, showUnits: false } },
        },
      },
    ];
  }
}
