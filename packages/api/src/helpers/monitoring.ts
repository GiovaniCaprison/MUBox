import type { MetricUnit } from "@aws-lambda-powertools/metrics/types";

import { logger, metrics, tracer } from "../clients/monitoring";

/**
 * Represents the result of an operation.
 */
export type OperationResult<T> = { threwError: false; responseHadError: boolean; response: T } | { threwError: true; error: unknown };

/**
 * A generic representation of a metric.
 */
export interface Metric {
  readonly name: string;
  readonly unit: MetricUnit;
  readonly value: number;
}

/**
 * Represents a generator for metrics based on the result of an operation and its arguments.
 */
export type MetricGenerator<T, A extends unknown[]> = (
  result: OperationResult<T>,
  ...args: A
) => { readonly name: string; readonly unit: MetricUnit; readonly value: number };

/**
 * Additional operation monitoring options.
 */
export interface MonitorOperationOpts<T, A extends unknown[]> {
  /**
   * Additional dimensions that should be applied to metrics emitted by this method.
   */
  readonly additionalDimensions?: (...args: A) => Record<string, string>;

  /**
   * Additional metrics that should be emitted.
   */
  readonly additionalMetrics?: readonly MetricGenerator<T, A>[];

  /**
   * A function that can be used to determine if a response was an error in case there are error states for the monitored function which do not throw
   * an error.
   */
  readonly isResponseError?: (response: T) => boolean;
}

export const publishMetricsWithDimensions = (metricsToBePublished: readonly Metric[], dimensions: Record<string, string>): void => {
  metrics.addDimensions(dimensions);
  metricsToBePublished.forEach(({ name, unit, value }) => metrics.addMetric(name, unit, value));

  // Publishes the requested metrics using the requested dimensions to ensure future operations are clear of dimension pollution.
  metrics.publishStoredMetrics();
};

/**
 * Monitors the provided operation by automatically including logging before/after, tracing, and metric emission.
 */
export const monitorOperation = function <T, A extends unknown[]>(
  operationName: string,
  operationLogic: (...args: A) => Promise<T> | T,
  opts: MonitorOperationOpts<T, A> = {},
): (...args: A) => Promise<T> {
  // Capture the `this` value when our returned function is executed as it should be applied to the given original fn
  return async function (this: unknown, ...args: A) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Our middleware creates a top level segment so getSegment will always return a defined segment
    const parentSegment = tracer.getSegment()!;
    const subsegment = parentSegment.addNewSubsegment(operationName);
    tracer.setSegment(subsegment);

    logger.info("Executing operation logic", { operationName });

    // Execute original function
    let result: OperationResult<T>;
    const before: number = performance.now();
    try {
      const response = await operationLogic.apply(this, args);

      const responseHadError = opts.isResponseError?.(response) ?? false;
      if (responseHadError) {
        subsegment.addErrorFlag();
      }

      result = { threwError: false, responseHadError, response };
    } catch (error) {
      result = { threwError: true, error };
      subsegment.addErrorFlag();
    }
    const after: number = performance.now();

    // Calculates the latency
    const latency: number = after - before;

    // Determines if the metric was a success or not
    const wasSuccess: boolean = !result.threwError && !result.responseHadError;

    // Publishes all of our metrics
    const metricsToBePublished: readonly Metric[] = [
      { name: "Count", unit: "Count", value: 1 },
      { name: "Latency", unit: "Milliseconds", value: latency },
      { name: "Success", unit: "Count", value: wasSuccess ? 1 : 0 },
      { name: "Failure", unit: "Count", value: wasSuccess ? 0 : 1 },
      ...(opts.additionalMetrics ? opts.additionalMetrics.map((metricGenerator) => metricGenerator(result, ...args)) : []),
    ];
    const dimensions = { Operation: operationName, ...(opts.additionalDimensions ? opts.additionalDimensions(...args) : {}) };
    publishMetricsWithDimensions(metricsToBePublished, dimensions);

    // Close our this segment and reset current segment in the tracer
    subsegment.close();
    tracer.setSegment(parentSegment);

    // Note - These log lines are used by Contributor Insights. If we update it, we need to update the monitoring for this in CDK.
    if (result.threwError) {
      logger.error("Operation threw an error", { error: result.error, latency, operationName });
      throw result.error;
    } else {
      if (result.responseHadError) {
        logger.error("Response from operation had an error", { response: result.response, latency, operationName });
      } else {
        logger.info("Successfully performed operation", { response: result.response, latency, operationName });
      }

      return result.response;
    }
  };
};
