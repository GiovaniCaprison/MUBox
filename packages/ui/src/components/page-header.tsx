import Header from "@cloudscape-design/components/header";
import Icon from "@cloudscape-design/components/icon";
import type { FunctionComponent, ReactNode } from "react";
import { useMatches } from "react-router";

import { PageSectionBackground } from "./page-section-background";
import { PageSectionContent } from "./page-section-content";
import { routeMetadata } from "@/routes";

export interface Props {
  readonly actions?: ReactNode;
}

export const PageHeader: FunctionComponent<Props> = ({ actions }) => {
  const [, lastMatch] = useMatches();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- This will produce a match where used
  const { icon, title, description } = routeMetadata.find(({ path }) => path === lastMatch.pathname)!;

  return (
    <PageSectionBackground color="header">
      <PageSectionContent className="mt-[80px] flex items-center gap-2 pt-4 pb-8">
        <Icon ariaLabel={`${title} Page Icon`} name={icon} size="large" />

        <Header actions={actions} description={description} variant="h1">
          {title}
        </Header>
      </PageSectionContent>
    </PageSectionBackground>
  );
};
