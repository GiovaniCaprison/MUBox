import { CfnDiscovery } from "aws-cdk-lib/aws-applicationsignals";
import { MonitoringFacade } from "cdk-monitoring-constructs";
import type { Construct } from "constructs";

import { APP_NAME, DOMAINS, HUMANIZED_STAGE_NAMES } from "../../constants";
import {
  AvailabilityMonitor,
  type AvailabilityMonitorProps,
  DashboardHeader,
  DeploymentStack,
  type DeploymentStackProps,
  TransactionSearch,
} from "../../constructs";
import type { Monitorable } from "../../types";

/**
 * Properties for the {@link MonitoringStack}.
 */
export interface MonitoringStackProps extends DeploymentStackProps {
  /**
   * Properties for how availability for this application is measured.
   */
  readonly availability: AvailabilityMonitorProps;

  /**
   * The constructs this stack should monitor.
   */
  readonly constructsToMonitor: readonly Monitorable[];
}

/**
 * This stack contains the monitoring infrastructure related to this website.
 */
export class MonitoringStack extends DeploymentStack {
  public constructor(scope: Construct, { availability, constructsToMonitor, env, stage }: MonitoringStackProps) {
    super(scope, "MonitoringStack", { env, stage });
    /**
     * Enables CloudWatch Application Signals for this application.
     *
     * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Signals-Enable.html
     */
    new CfnDiscovery(this, "AWSServiceRoleForCloudWatchApplicationSignals");

    /**
     * Enables transaction search for this application.
     *
     * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Transaction-Search-getting-started.html
     */
    new TransactionSearch(this);

    /**
     * Sets up the monitoring facade that will be used to set up all of our monitoring.
     * @see https://github.com/cdklabs/cdk-monitoring-constructs
     */
    const appNameAndStage = `${APP_NAME}-${HUMANIZED_STAGE_NAMES[stage]}`;
    const monitoring = new MonitoringFacade(this, "Monitoring", {
      alarmFactoryDefaults: {
        actionsEnabled: {},
        alarmNamePrefix: appNameAndStage,
      },
    });

    const { domainName } = DOMAINS[stage];
    const description = `This dashboard contains the key operational metrics for the infrastructure that powers the ${APP_NAME} website at https://${domainName}.`;

    monitoring.addWidget(
      new DashboardHeader({
        description,
        domainName,
        name: APP_NAME,
        // add pipeline url
      }),
    );

    monitoring.addWidget(new AvailabilityMonitor(availability));

    constructsToMonitor.forEach((monitorable) => monitorable.addMonitoring(monitoring));
  }
}
