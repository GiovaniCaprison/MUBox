import Alert from "@cloudscape-design/components/alert";
import Spinner from "@cloudscape-design/components/spinner";
import { useQuery } from "@tanstack/react-query";
import type { FunctionComponent } from "react";

import { useTRPC } from "@/clients/trpc-client";

export const HelloFromRegion: FunctionComponent = () => {
  const trpc = useTRPC();
  const { status, error, data } = useQuery(trpc.region.queryOptions());

  if (status === "error") {
    return (
      <Alert type="error">
        <b>Error</b>: We encountered an error while retrieving the region: <i>{error.message}</i>
      </Alert>
    );
  }

  return (
    <span title="The region this website is currently responding from" className="font-medium">
      Hello from {status === "pending" ? <Spinner /> : data}!
    </span>
  );
};
