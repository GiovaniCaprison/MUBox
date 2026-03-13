import { OPERATIONS } from "@mubox/local-shared";
import { z } from "zod";

import { environmentVariables } from "../helpers/environment-variables";
import { procedure } from "../helpers/trpc";

export const region = procedure(OPERATIONS.GET_REGION)
  .input(z.undefined())
  .query(() => environmentVariables.region);
