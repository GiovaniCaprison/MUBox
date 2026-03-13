import { currentUserId } from "./current-user-id";
import { region } from "./region";
import { createRouter } from "../helpers/trpc";

export const rootRouter = createRouter({ currentUserId, region });
