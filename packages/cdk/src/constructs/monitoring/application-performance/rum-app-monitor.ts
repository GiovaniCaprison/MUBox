import {
  GraphWidget,
  GraphWidgetView,
  type IMetric,
  Row,
  SingleValueWidget,
  TableSummaryColumn,
  TableWidget,
} from "aws-cdk-lib/aws-cloudwatch";
import { CfnAppMonitor } from "aws-cdk-lib/aws-rum";
import { Stack } from "aws-cdk-lib/core";
import { MetricStatistic, MonitoringFacade } from "cdk-monitoring-constructs";
import { Construct } from "constructs";

import { APP_NAME, RumMetricNames } from "../../../constants";
import type { Monitorable } from "../../../types";

/**
 * Properties for the RUM application monitor.
 */
export interface RumAppMonitorProps {
  /**
   * The domain for the application.
   */
  readonly domain: string;

  /**
   * The name of this application.
   */
  readonly name: string;
}

/**
 * A construct representing RUM (real user metrics) application monitor.
 */
export class RumAppMonitor extends CfnAppMonitor implements Monitorable {
  /**
   * The ARN of this app monitor.
   */
  public readonly arn: string;

  public constructor(scope: Construct, id: string, { domain, name }: RumAppMonitorProps) {
    super(scope, id, {
      domain,
      name,
      appMonitorConfiguration: {
        allowCookies: true,
        enableXRay: true,
        sessionSampleRate: 1,
      },
      customEvents: {
        status: "ENABLED",
      },
      cwLogEnabled: false, // We emit logs in our API to a custom, easier to use log group
    });

    // Sets an ARN property to make it easier for clients to access it
    const { account, region, partition } = Stack.of(this);
    this.arn = `arn:${partition}:rum:${region}:${account}:appmonitor/${name}`;
  }

  public addMonitoring(monitoring: MonitoringFacade): void {
    const metricFactory = monitoring.createMetricFactory();

    const getRumMetric = (metricName: RumMetricNames, statistic: MetricStatistic, label: string, color?: string): IMetric =>
      metricFactory.createMetric(metricName, statistic, label, { application_name: APP_NAME }, color, "AWS/RUM");

    const sessions = getRumMetric(RumMetricNames.SESSION_COUNT, MetricStatistic.SUM, "Sessions");
    const pageViews = getRumMetric(RumMetricNames.PAGE_VIEWS, MetricStatistic.SUM, "Page Views");

    const javaScriptErrors = getRumMetric(RumMetricNames.JAVASCRIPT_ERRORS, MetricStatistic.SUM, "JavaScript Errors");
    const http4xxErrors = getRumMetric(RumMetricNames.HTTP_4XX_ERRORS, MetricStatistic.SUM, "4xx HTTP Errors");
    const http5xxErrors = getRumMetric(RumMetricNames.HTTP_5XX_ERRORS, MetricStatistic.SUM, "5xx HTTP Errors");

    monitoring
      .addSmallHeader("User Experience", true)
      .addWidget(
        new Row(
          new SingleValueWidget({
            title: "Total Usage",
            metrics: [sessions, pageViews],
            fullPrecision: true,
            setPeriodToTimeRange: true,
            width: 4,
            height: 6,
          }),
          new GraphWidget({
            title: "Usage",
            left: [sessions, pageViews],
            leftYAxis: { label: "Count", min: 0, showUnits: false },
            width: 8,
          }),
          new SingleValueWidget({
            title: "Total Errors",
            metrics: [javaScriptErrors, http4xxErrors, http5xxErrors],
            fullPrecision: true,
            setPeriodToTimeRange: true,
            width: 4,
            height: 6,
          }),
          new GraphWidget({
            title: "Errors",
            left: [javaScriptErrors, http4xxErrors, http5xxErrors],
            leftYAxis: { label: "Errors", min: 0, showUnits: false },
            width: 8,
          }),
        ),
        true,
      )
      .addWidget(
        new Row(
          new GraphWidget({
            title: "Page Load Performance",
            left: [
              getRumMetric(RumMetricNames.PAGE_LOAD_PERFORMANCE, MetricStatistic.P50, "P50 (avg: ${AVG})"),
              getRumMetric(RumMetricNames.PAGE_LOAD_PERFORMANCE, MetricStatistic.P90, "P90 (avg: ${AVG})"),
              getRumMetric(RumMetricNames.PAGE_LOAD_PERFORMANCE, MetricStatistic.P99, "P99 (avg: ${AVG})"),
            ],
            leftYAxis: { min: 0 },
            width: 9,
          }),
          new GraphWidget({
            title: "Performance Satisfaction",
            left: [
              getRumMetric(RumMetricNames.NAVIGATION_SATISFIED, MetricStatistic.SUM, "Satisfying (${SUM})", "#2ca02c"),
              getRumMetric(RumMetricNames.NAVIGATION_TOLERATED, MetricStatistic.SUM, "Tolerable (${SUM})", "#f89256"),
              getRumMetric(RumMetricNames.NAVIGATION_FRUSTRATED, MetricStatistic.SUM, "Frustrating (${SUM})", "#d62728"),
            ],
            setPeriodToTimeRange: true,
            view: GraphWidgetView.PIE,
            width: 6,
          }),
          new TableWidget({
            title: "Web Vitals",
            metrics: [
              getRumMetric(RumMetricNames.WEB_VITALS_LCP, MetricStatistic.AVERAGE, "Largest Contentful Paint"),
              getRumMetric(RumMetricNames.WEB_VITALS_FID, MetricStatistic.AVERAGE, "First Input Delay"),
              getRumMetric(RumMetricNames.WEB_VITALS_CLS, MetricStatistic.AVERAGE, "Cumulative Layout Shift"),
              getRumMetric(RumMetricNames.WEB_VITALS_INP, MetricStatistic.AVERAGE, "Interaction to Next Paint"),
            ],
            summary: {
              columns: [TableSummaryColumn.MINIMUM, TableSummaryColumn.AVERAGE, TableSummaryColumn.MAXIMUM],
              hideNonSummaryColumns: true,
            },
            width: 9,
          }),
        ),
      );
  }
}
