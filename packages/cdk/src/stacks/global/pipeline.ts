import { Stack, type StackProps } from "aws-cdk-lib/core";
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";

import { HUMANIZED_STAGE_NAMES } from "../../constants";
import { BetaStage, ProdStage } from "../../constructs/stages";
import { Stage } from "../../types";

/**
 * ARN of the AWS CodeStar Connection to GitHub.
 */
const GITHUB_CONNECTION_ARN =
  "arn:aws:codeconnections:us-east-1:250031966523:connection/e1940f22-dc90-4e67-a09b-a9104b9aba0c";

export function isProd(stage: Stage): boolean {
  return stage === Stage.PROD;
}

/**
 * A CloudFormation stack that deploys the CI/CD CodePipeline.
 *
 * CodePipeline (via CDK Pipelines) must live inside a Stack — it cannot be
 * parented directly to an App. This stack is deployed to the pipeline account
 * and orchestrates promotions through Beta → Prod with a manual approval gate.
 */
export class PipelineStack extends Stack {
  constructor(scope: Construct, props: StackProps) {
    super(scope, "PipelineStack", props);

    const pipeline = new CodePipeline(this, "Pipeline", {
      crossAccountKeys: true,
      synth: new ShellStep("Synth", {
        // CodeStar Connection (GitHub App) — avoids the legacy OAuth/Secrets Manager path.
        input: CodePipelineSource.connection("GiovaniCaprison/MUBox", "mainline", {
          connectionArn: GITHUB_CONNECTION_ARN,
        }),
        commands: ["npm ci", "npm run release"],
      }),
    });

    // Beta deploy
    pipeline.addStage(new BetaStage(this, HUMANIZED_STAGE_NAMES[Stage.BETA]));

    // Prod deploy — manual gate before promoting to production
    pipeline.addStage(new ProdStage(this, HUMANIZED_STAGE_NAMES[Stage.PROD]), {
      pre: [new ManualApprovalStep("PromoteToProd")],
    });
  }
}
