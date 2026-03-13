import type { StageConfiguration } from "../types";

const MUBOX: StageConfiguration<string> = {
  BETA: "211391213128",
  PROD: "147997139104",
};

/**
 * The AWS account that hosts the CodePipeline and shared infrastructure
 * such as the Cognito User Pool that is reused across all stages.
 */
const PIPELINE = "250031966523";

export const ACCOUNTS = { PIPELINE, MUBOX };
