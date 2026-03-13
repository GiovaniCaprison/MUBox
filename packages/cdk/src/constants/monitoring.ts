/**
 * RUM metric names.
 *
 * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM-metrics.html
 */
export enum RumMetricNames {
  HTTP_4XX_ERRORS = "Http4xxCount",
  HTTP_5XX_ERRORS = "Http5xxCount",
  JAVASCRIPT_ERRORS = "JsErrorCount",
  NAVIGATION_FRUSTRATED = "NavigationFrustratedTransaction",
  NAVIGATION_SATISFIED = "NavigationSatisfiedTransaction",
  NAVIGATION_TOLERATED = "NavigationToleratedTransaction",
  PAGE_LOAD_PERFORMANCE = "PerformanceNavigationDuration",
  PAGE_VIEWS = "PageViewCount",
  SESSION_COUNT = "SessionCount",
  WEB_VITALS_CLS = "WebVitalsCumulativeLayoutShift",
  WEB_VITALS_FID = "WebVitalsFirstInputDelay",
  WEB_VITALS_INP = "WebVitalsInteractionToNextPaint",
  WEB_VITALS_LCP = "WebVitalsLargestContentfulPaint",
}
