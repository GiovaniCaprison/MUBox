import { MonitoringFacade } from "cdk-monitoring-constructs";

/**
 * An interface defining anything which can be monitored via means such as alarms, metrics, dashboards, etc.
 */
export interface Monitorable<T = never> {
  /**
   * Adds monitoring to the construct that implements it within the provided monitoring scope.
   *
   * @param monitoring The monitoring facade to add the monitoring to.
   * @param props [Optional] Any additional properties required to add the monitoring.
   */
  addMonitoring: (monitoring: MonitoringFacade, props?: T) => void;
}
