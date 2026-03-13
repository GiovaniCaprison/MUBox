/**
 * External service clients - Public API
 * Barrel export for all client configurations
 */

export { fetch } from "./fetch-client";
export { queryClient } from "./query-client";
export { rum, setupRum } from "./rum-client";
export { DefaultTrpcProvider, useTRPC } from "./trpc-client";
