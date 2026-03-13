import { Stack, type StackProps } from "aws-cdk-lib/core";
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";

import { HUMANIZED_STAGE_NAMES } from "../../constants";
import { BetaStage, ProdStage } from "../../constructs/stages";
import { Stage } from "../../types";

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
        input: CodePipelineSource.gitHub("GiovaniCaprison/MUBox", "mainline"),
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
