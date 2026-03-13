import type { FunctionComponent } from "react";

import { FAQSection, type FAQSectionProps } from "./faq-section";
import { PageHeader } from "@/components/page-header";
import { architectureFaqs, developmentFaqs, futureFaqs, muboxFaqs, platformFaqs, securityFaqs, whyFaqs } from "@/constants/faq-entries";

const faqSections: Omit<FAQSectionProps, "index">[] = [
  { name: "MUBox", faqEntries: muboxFaqs },
  { name: "Why MUBox", faqEntries: whyFaqs },
  { name: "Development", faqEntries: developmentFaqs },
  { name: "Architecture", faqEntries: architectureFaqs },
  { name: "Security", faqEntries: securityFaqs },
  { name: "Platform", faqEntries: platformFaqs },
  { name: "The Future", faqEntries: futureFaqs },
];

export const FAQPage: FunctionComponent = () => (
  <>
    <PageHeader />

    {faqSections.map((faqSection, index) => (
      <FAQSection key={index} {...faqSection} index={index} />
    ))}
  </>
);
