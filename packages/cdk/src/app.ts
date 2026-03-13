import { GLOBAL_INFRASTRUCTURE_REGION } from "@mubox/local-shared";
import { App } from "aws-cdk-lib/core";

import { ACCOUNTS, CDK_CONTEXT, DOMAINS } from "./constants";
import { CognitoStack, PipelineStack } from "./stacks";
import { Stage } from "./types";

export const app = new App({
  context: CDK_CONTEXT,
});

new CognitoStack(app, {
  env: { account: ACCOUNTS.PIPELINE, region: GLOBAL_INFRASTRUCTURE_REGION.id },
  allowedDomains: [DOMAINS[Stage.BETA].domainName, DOMAINS[Stage.PROD].domainName],
});

new PipelineStack(app, {
  env: { account: ACCOUNTS.PIPELINE, region: GLOBAL_INFRASTRUCTURE_REGION.id },
});

app.synth();
