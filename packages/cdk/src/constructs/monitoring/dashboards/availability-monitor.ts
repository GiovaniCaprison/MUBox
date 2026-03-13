import {
  Column,
  GaugeWidget,
  GraphWidget,
  GRID_WIDTH,
  type IMetric,
  LegendPosition,
  MathExpression,
  Row,
  Shading,
  TextWidget,
} from "aws-cdk-lib/aws-cloudwatch";

/**
 * An interface representing a metric and the definition of it..
 */
export interface MetricWithDefinition {
  /**
   * The metric.
   */
  readonly metric: IMetric;

  /**
   * How this metric is defined in human readable text.
   */
  readonly definition: string;
}

/**
 * Properties for the {@link AvailabilityMonitor} construct.
 */
export interface AvailabilityMonitorProps {
  /**
   * A metric tracking failures.
   */
  readonly failures: MetricWithDefinition;

  /**
   * A metric tracking total number of requests.
   */
  readonly requests: MetricWithDefinition;
}

const GAUGE_WIDTH = 8;

/**
 * A widget that contains a dedicated header, definitions of success/failure/availability, a column of summary metrics, and a graph of availability
 * over time.
 */
export class AvailabilityMonitor extends Column {
  public constructor({ failures, requests }: AvailabilityMonitorProps) {
    const header = new TextWidget({
      markdown:
        `## Availability\n\n` +
        "Total Requests | Failure | Availability\n" +
        "----|-----|----- \n" +
        `${requests.definition} | ${failures.definition} | Availability is defined by **100 * (Total Requests - Failures) / (Total Requests)**`,
      height: 3,
      width: GRID_WIDTH,
    });

    const availabilityMetric = new MathExpression({
      expression: "100 * (requests - failures) / requests",
      label: "Availability (avg: ${AVG}%, min: ${MIN}%)",
      usingMetrics: { requests: requests.metric, failures: failures.metric },
    });

    const availabilityGauge = new GaugeWidget({
      title: "Availability",
      annotations: [
        { color: "#d62728", value: 90, fill: Shading.BELOW },
        // @ts-expect-error -- This is how between ranges are done, but CDK does not support them directly yet.
        [{ color: "#f89256", value: 90 }, { value: 99 }],
        { color: "#2ca02c", value: 99, fill: Shading.ABOVE },
      ],
      legendPosition: LegendPosition.HIDDEN,
      metrics: [availabilityMetric],
      setPeriodToTimeRange: true,
      height: 9,
      width: GAUGE_WIDTH,
    });

    const availabilityGraph = new GraphWidget({
      title: "Availability",
      left: [availabilityMetric],
      leftYAxis: { max: 100, label: "%", showUnits: false },
      leftAnnotations: [{ label: "Availability Target", color: "#2ca02c", value: 99.9 }],
      right: [requests.metric],
      rightYAxis: { min: 0, label: "Count", showUnits: false },
      height: 9,
      width: GRID_WIDTH - GAUGE_WIDTH,
    });

    super(header, new Row(availabilityGauge, availabilityGraph));
  }
}
