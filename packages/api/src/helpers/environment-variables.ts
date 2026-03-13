import { type ZodString, z } from "zod";

const REGION_ENV_VARIABLE_KEY = "AWS_REGION";

const envVariableValidator = (key: string): ZodString =>
  z
    .string({
      error: (issue) =>
        issue.input === undefined ? `Environment variable ${key} was not set` : `Environment variable ${key} was not a string`,
    })
    .nonempty({ error: `Environment variable ${key} was empty` });

/**
 * A helper for accessing environment variables that have been verified to be present.
 */
export const environmentVariables = z
  .object({
    [REGION_ENV_VARIABLE_KEY]: envVariableValidator(REGION_ENV_VARIABLE_KEY),
  })
  .transform((parsed) => ({
    region: parsed.AWS_REGION,
  }))
  .parse(process.env);
