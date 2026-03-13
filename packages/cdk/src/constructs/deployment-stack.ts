import type { RegionId } from "@mubox/local-shared";
import { Stack, type StackProps } from "aws-cdk-lib/core";
import { Construct } from "constructs";

import { HUMANIZED_STAGE_NAMES } from "../constants";
import { Stage } from "../types";

/**
 * Base properties among all stacks. Contains stage and environment information.
 */
export interface DeploymentStackProps extends StackProps {
  /**
   * The stage this stack is deploying to.
   */
  readonly stage: Stage;
}

/**
 * A custom construct that is a simple wrapper around Stack so that it takes into account
 * the stage and region that it is deploying to so that we don't get conflicting construct names in
 * the app as we iterate over our stages.
 */
export abstract class DeploymentStack extends Stack {
  /**
   * The stage this stack is deployed to.
   */
  public readonly stage: Stage;

  /**
   * The region this stack is deployed to.
   *
   * This overrides the default region property with a more strongly typed variant that is restricted to only the regions we use.
   */
  declare public readonly region: RegionId;

  public constructor(scope: Construct, id: string, props: DeploymentStackProps) {
    const { stage, env } = props;

    /**
     * Create a stack name that includes the specified stack name, the stage name, and the region so
     * that we avoid conflicts as we iterate through our stages.
     */
    const stackName = `${id}-${HUMANIZED_STAGE_NAMES[stage]}-${env?.region?.toUpperCase()}`;

    super(scope, stackName, {
      ...props,
      stackName,
      crossRegionReferences: true,
    });

    this.stage = stage;
  }
}
