import type { FunctionComponent } from "react";

import { LinkableSection } from "@/components/linkable-section";
import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/page-header";
import { PageSectionBackground } from "@/components/page-section-background";
import { PageSectionContent } from "@/components/page-section-content";

interface QuickStartSection {
  readonly title: string;
  readonly content: string;
}

const quickStartSections: QuickStartSection[] = [
  {
    title: "You Might Have Questions",
    content: `MUBox is a platform for hosting interactive educational tools related to computer
science and formal computation.

But rather than repeating the conceptual overview here, the motivation, goals, and
design philosophy of the project are described in detail on the **FAQ** page.`,
  },
  {
    title: "Using the Platform",
    content: `MUBox tools are designed to run directly in the browser. No installation or local setup is required.

To begin using the platform:

1. Visit **https://mu-box.com**
2. Select a tool from the available tools page
3. Begin interacting with the tool directly in your browser

All tools hosted on MUBox are accessible through the same platform interface and include their own documentation and usage instructions.`,
  },
  {
    title: "Available Tools",
    content: `MUBox currently hosts the following educational tools:

1. **TSFlap**

  TSFlap is an interactive environment for constructing and simulating computational models from formal language theory. The tool supports deterministic finite automata (DFA), nondeterministic finite automata (NFA), and Turing machines, allowing users to experiment with the behaviour of these models and observe their execution step by step.

  Additional tools may be added to the platform over time as the MUBox ecosystem evolves.`,
  },
  {
    title: "Platform Architecture",
    content: `MUBox is implemented as a cloud-hosted web platform designed for global accessibility and scalability. The system uses a serverless architecture to deliver static content, execute backend functionality, and collect operational telemetry.

Detailed information about the system design, infrastructure layout, and deployment pipeline can be found on the **Architecture** page.`,
  },
  {
    title: "Contributing Tools",
    content: `MUBox is designed to support the integration of additional educational tools.

Tools hosted on the platform are typically developed as standalone libraries that expose their computational logic independently from the user interface. This allows tools to be reused, tested, and extended without being tightly coupled to the platform itself.

Developers interested in contributing new tools or extending the platform should refer to the **Contribute** page for documentation describing the project structure, development workflow, and integration process.`,
  },
];

export const QuickStartPage: FunctionComponent = () => (
  <>
    <PageHeader />

    {quickStartSections.map((section, index) => (
      <PageSectionBackground key={section.title} color={index % 2 === 0 ? "section" : "header"}>
        <PageSectionContent className="py-8">
          <LinkableSection title={section.title}>
            <Markdown>{section.content}</Markdown>
          </LinkableSection>
        </PageSectionContent>
      </PageSectionBackground>
    ))}
  </>
);
