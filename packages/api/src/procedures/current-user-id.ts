import { OPERATIONS } from "@mubox/local-shared";
import { z } from "zod";

import { procedure } from "../helpers/trpc";

export const currentUserId = procedure(OPERATIONS.GET_CURRENT_USER_ID)
  .input(z.undefined())
  .query(({ ctx }) => ctx.userId);
