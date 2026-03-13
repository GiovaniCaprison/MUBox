import type { RootRouter } from "@mubox/local-api";
import { createTRPCContext } from "@trpc/tanstack-react-query";

// eslint-disable-next-line @typescript-eslint/naming-convention -- DefaultTrpcProvider is React component that must be capitalized.
export const { TRPCProvider: DefaultTrpcProvider, useTRPC } = createTRPCContext<RootRouter>();
