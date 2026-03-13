import type { RootRouter } from "@mubox/local-api";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { useContext, useMemo, type FunctionComponent, type ReactNode } from "react";

import { RegionContext } from "./region-provider";
import { fetch } from "@/clients/fetch-client";
import { queryClient } from "@/clients/query-client";
import { DefaultTrpcProvider } from "@/clients/trpc-client";

interface Props {
  readonly children: ReactNode;
}

export const TrpcProvider: FunctionComponent<Props> = ({ children }) => {
  const { region } = useContext(RegionContext);

  const trpcClient = useMemo(() => createTRPCClient<RootRouter>({ links: [httpBatchLink({ fetch, url: `/api/${region}` })] }), [region]);

  return (
    <DefaultTrpcProvider trpcClient={trpcClient} queryClient={queryClient}>
      {children}
    </DefaultTrpcProvider>
  );
};
