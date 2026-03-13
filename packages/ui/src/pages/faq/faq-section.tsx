import Box from "@cloudscape-design/components/box";
import type { FunctionComponent } from "react";

import { LinkableSection } from "@/components/linkable-section";
import { Markdown } from "@/components/markdown";
import { PageSectionBackground } from "@/components/page-section-background";
import { PageSectionContent } from "@/components/page-section-content";
import type { FAQEntry } from "@/types/faq";

export interface FAQSectionProps {
  readonly faqEntries: FAQEntry[];
  readonly index: number;
  readonly name: string;
}

export const FAQSection: FunctionComponent<FAQSectionProps> = ({ faqEntries, index, name }) => (
  <PageSectionBackground color={index % 2 === 0 ? "section" : "header"}>
    <PageSectionContent className="py-8">
      <Box variant="h2" fontSize="heading-xl">
        {name}
      </Box>

      {faqEntries.map((faqEntry, faqNum) => (
        <LinkableSection key={faqNum} title={faqEntry.question}>
          <Markdown>{faqEntry.answer}</Markdown>
        </LinkableSection>
      ))}
    </PageSectionContent>
  </PageSectionBackground>
);
