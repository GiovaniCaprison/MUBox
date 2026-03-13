import { rootRouter } from "./procedures/root-router";

/**
 * Exports the type of the router which will be consumed by the UI.
 *
 * Note this is just the type - not the actual router itself.
 */
export type RootRouter = typeof rootRouter;
