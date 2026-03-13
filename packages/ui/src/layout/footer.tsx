import { type FunctionComponent } from "react";

import { HelloFromRegion } from "./hello-from-region";
import { MaynoothLogo } from "@/components/maynooth-logo";
import { PageSectionContent } from "@/components/page-section-content";

export const Footer: FunctionComponent = () => {
  return (
    <footer className="bg-header-bg border-primary mt-auto border-t-1">
      <PageSectionContent className="grid grid-cols-[max-content_auto_max-content] py-8">
        <HelloFromRegion />

        <MaynoothLogo className="col-[3]" width="24px" />
      </PageSectionContent>
    </footer>
  );
};
