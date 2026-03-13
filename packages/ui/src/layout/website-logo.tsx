import { type FunctionComponent } from "react";
import { Link } from "react-router";

import { MaynoothLogo } from "@/components/maynooth-logo";

export const WebsiteLogo: FunctionComponent = () => {
  return (
    <Link to="/" className="mt-[10px] flex grow-4 items-center gap-2 md:grow-0">
      <MaynoothLogo width="24px" className="shrink-0 -translate-y-[5px]" />
      <span className="text-primary inline-block -translate-y-[7px] text-[25.3px] font-normal">MUBox</span>
    </Link>
  );
};
