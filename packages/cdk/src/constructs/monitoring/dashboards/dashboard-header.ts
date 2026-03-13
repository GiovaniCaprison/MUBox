import { TextWidget } from "aws-cdk-lib/aws-cloudwatch";

/**
 * Properties for the {@link DashboardHeader} construct.
 */
export interface DashboardHeaderProps {
  /**
   * A description of this service.
   */
  readonly description: string;

  /**
   * The domain name of this website.
   */
  readonly domainName: string;

  /**
   * The name of this website.
   */
  readonly name: string;

  /**
   * An optional direct link to the CodePipeline in the AWS Console.
   *
   * @example `https://us-east-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/Pipeline/view`
   */
  readonly pipelineConsoleUrl?: string;
}

/**
 * A widget that serves as a nicely-formatted dashboard header.
 */
export class DashboardHeader extends TextWidget {
  public constructor({ description, domainName, name, pipelineConsoleUrl }: DashboardHeaderProps) {
    const title = `# ${name}`;
    const viewWebsiteButton = `[button:View Website](https://${domainName})`;
    const pipelineButton = pipelineConsoleUrl ? ` [button:View Pipeline](${pipelineConsoleUrl})` : "";

    super({
      markdown: `${title}\n${viewWebsiteButton}${pipelineButton}\n\n${description}`,
      height: 3,
      width: 24,
    });
  }
}
