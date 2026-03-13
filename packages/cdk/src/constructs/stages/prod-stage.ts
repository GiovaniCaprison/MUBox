import { GLOBAL_INFRASTRUCTURE_REGION, REGIONS } from "@mubox/local-shared";
import { Stage, type StageProps } from "aws-cdk-lib/core";
import { Construct } from "constructs";

import { ACCOUNTS, DOMAINS } from "../../constants";
import { ApiStack, MonitoringStack, Route53HostedZoneStack, RumStack, UIStack } from "../../stacks";
import { Stage as StageEnum } from "../../types";

export class ProdStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const stage = StageEnum.PROD;
    const account = ACCOUNTS.MUBOX[stage];

    const globalEnv = {
      account,
      region: GLOBAL_INFRASTRUCTURE_REGION.id,
    };

    const route53 = new Route53HostedZoneStack(this, {
      ...DOMAINS[stage],
      env: globalEnv,
      stage,
    });

    const rum = new RumStack(this, {
      env: globalEnv,
      stage,
    });

    const apiStacks = REGIONS.map(
      (region) =>
        new ApiStack(this, {
          env: {
            account,
            region: region.id,
          },
          stage,
        }),
    );

    const ui = new UIStack(this, {
      apiFunctionUrls: apiStacks.map((a) => a.apiLambda.url),
      env: globalEnv,
      route53HostedZone: route53.hostedZone,
      rumFunctionUrl: rum.lambda.url,
      stage,
    });

    new MonitoringStack(this, {
      availability: {
        failures: {
          definition: "An 5xx response from the CloudFront distribution.",
          metric: ui.website.metricTotalFailures,
        },
        requests: {
          definition: "Any request to the CloudFront distribution.",
          metric: ui.website.metricTotalRequests,
        },
      },
      constructsToMonitor: [rum, route53, ui, ...apiStacks.toReversed()],
      env: globalEnv,
      stage,
    });
  }
}
