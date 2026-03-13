import Box from "@cloudscape-design/components/box";
import Icon, { type IconProps } from "@cloudscape-design/components/icon";
import type { FunctionComponent } from "react";

import { Markdown } from "@/components/markdown";
import { PageSectionBackground } from "@/components/page-section-background";
import { PageSectionContent } from "@/components/page-section-content";

export interface DescriptionSectionProps {
  readonly icon: IconProps.Name;
  readonly description: string;
  readonly index: number;
  readonly title: string;
}

export const DescriptionSection: FunctionComponent<DescriptionSectionProps> = ({ description, icon, index, title }) => {
  const isEvenRow: boolean = index % 2 === 0;

  return (
    <PageSectionBackground color={isEvenRow ? "section" : "header"}>
      <PageSectionContent className="py-4 sm:py-10 md:py-16">
        <div className={`mb-8 flex items-center ${isEvenRow ? "flex-row" : "flex-row-reverse"}`}>
          <Icon ariaLabel={`${title} Section Icon`} name={icon} size="large" />
          <Box variant="h3" fontSize="display-l" margin={{ horizontal: "m" }}>
            {title}
          </Box>
        </div>

        <Markdown className="text-justify text-xl">{description}</Markdown>
      </PageSectionContent>
    </PageSectionBackground>
  );
};
