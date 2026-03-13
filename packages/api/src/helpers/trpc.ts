import { initTRPC } from "@trpc/server";

import { monitorOperation } from "./monitoring";
import { logger } from "../clients/monitoring";
import type { Context } from "../types/context";
import type { Meta } from "../types/meta";

const trpc = initTRPC.context<Context>().meta<Meta>().create();

/**
 * Export reusable helpers that can be used throughout the application.
 */
export const createRouter = trpc.router;
export const createMiddleware = trpc.middleware;

/**
 * Adds automatic logging and metrics to all requests.
 */
const monitorProcedure = createMiddleware(async ({ ctx, meta, next }) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- This will always be defined given this is only used in the procedure below which enforces meta being set
  const procedureName = meta!.name;

  // Ensures all log lines include the context
  logger.appendKeys({ ...ctx, procedureName });

  // Actually calls the procedure wrapping it with our monitoring.
  return monitorOperation(`${procedureName}Procedure`, async () => next(), { isResponseError: (response) => !response.ok })();
});

/**
 * Creates a procedure that is automatically monitored with logging, metrics, and tracing.
 *
 * * @param name The name of this procedure.
 */
export const procedure = (name: string) => trpc.procedure.meta({ name }).use(monitorProcedure);
