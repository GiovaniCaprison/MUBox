import Alert from "@cloudscape-design/components/alert";
import Icon from "@cloudscape-design/components/icon";
import { useQuery } from "@tanstack/react-query";
import type { FunctionComponent } from "react";

import { useTRPC } from "@/clients/trpc-client";

const baseClasses = "object-cover size-10 rounded-full";

export const ViewerAvatar: FunctionComponent = () => {
  const trpc = useTRPC();
  const { status, error, data } = useQuery(trpc.currentUserId.queryOptions());

  if (status === "error") {
    return (
      <Alert type="error">
        <b>Error</b>: We encountered an error while retrieving the userId: <i>{error.message}</i>
      </Alert>
    );
  } else if (status === "pending") {
    return (
      <div className={`${baseClasses} flex animate-pulse items-center justify-center bg-zinc-300 dark:bg-zinc-600`}>
        <Icon ariaLabel="Loading user avatar" name="user-profile-active" variant="subtle" />
      </div>
    );
  }

  return <img alt={`${data} avatar`} className={baseClasses} src={`https://api.dicebear.com/7.x/identicon/svg?seed=${data}`} />;
};
