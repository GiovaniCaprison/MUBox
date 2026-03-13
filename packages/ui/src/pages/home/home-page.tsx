import type { FunctionComponent } from "react";

import { DescriptionSection, type DescriptionSectionProps } from "./description-section";
import { HomePageHeader } from "./home-page-header";
import { ExternalLinks } from "@/constants/external-links";

const descriptionSectionsProps: Omit<DescriptionSectionProps, "index">[] = [
  {
    title: "What MUBox Is",
    description: `MUBox is an open-source platform designed to host interactive educational tools for computer science. The platform was created during the development of **TSFlap**, a modern TypeScript implementation of a formal languages simulator originally inspired by [JSFLAP](${ExternalLinks.JSFLAP_WEBSITE}). During the course of the thesis work it became clear that the tooling built to support TSFlap — deployment infrastructure, authentication, observability, and CI/CD — could be generalised into a reusable platform capable of hosting many similar educational applications. MUBox therefore evolved from a single project deployment into a broader system designed to host multiple independent learning tools within a shared operational environment. The objective of the platform is to make it easier to develop, deploy, and maintain interactive educational software that can be accessed globally through the web.`,
    icon: "suggestions-gen-ai",
  },

  {
    title: "Educational Motivation",
    description: `Many areas of computer science are fundamentally easier to understand through experimentation rather than static reading material. This is particularly true in subjects such as formal languages, automata theory, distributed systems, and networking where behaviour emerges through system execution rather than static definitions. Historically tools such as [JSFLAP](${ExternalLinks.JSFLAP_WEBSITE}) have helped address this problem by providing environments where students can construct and simulate automata directly. However many of these tools were built as standalone applications and were not designed with modern web deployment, extensibility, or collaborative development in mind. MUBox attempts to address this gap by providing a platform where new educational tools can be developed as open-source projects and deployed within a shared infrastructure environment. This allows students and researchers to focus primarily on the pedagogical aspects of their tools while relying on the platform for deployment, authentication, and operational concerns.`,
    icon: "transcript",
  },

  {
    title: "Platform Architecture",
    description: `MUBox is deployed using a modern cloud-native architecture designed to support globally accessible interactive applications. The platform uses [Amazon CloudFront](${ExternalLinks.AWS_CLOUDFRONT}) for global content distribution, [AWS Lambda](${ExternalLinks.AWS_LAMBDA}) for serverless backend services, and [Lambda@Edge](${ExternalLinks.AWS_LAMBDA_EDGE}) for authentication interception and request processing at the edge. Identity management is handled by [Amazon Cognito](${ExternalLinks.AWS_COGNITO}), request filtering and web security are provided by [AWS WAF](${ExternalLinks.AWS_WAF}), and infrastructure is defined as code using [AWS CDK](${ExternalLinks.AWS_CDK}). This architecture provides strong operational characteristics including horizontal scalability, low operational overhead, and global availability. All infrastructure is defined programmatically and deployed through a CI/CD pipeline, allowing the entire system to be reproduced and extended through version-controlled infrastructure definitions.`,
    icon: "settings",
  },

  {
    title: "Engineering Principles",
    description: `The platform is designed using modern software engineering practices intended to support long-term maintainability and extensibility. [TypeScript](${ExternalLinks.TYPESCRIPT}) is the primary language across frontend, backend, and infrastructure, providing a unified development experience. [React](${ExternalLinks.REACT}) is used for the web interface, [tRPC](${ExternalLinks.TRPC}) provides end-to-end type-safe APIs, and [Zod](${ExternalLinks.ZOD}) enables runtime schema validation. Monorepo management and incremental builds are handled by [Nx](${ExternalLinks.NX}), and [Vitest](${ExternalLinks.VITEST}) provides automated testing capabilities. This unified stack allows type safety to propagate throughout the entire system while maintaining a consistent development environment across all parts of the codebase.`,
    icon: "command-prompt",
  },

  {
    title: "Security and Reliability",
    description: `MUBox is designed with security and operational reliability as primary concerns. Authentication is enforced at the edge using Lambda@Edge before requests reach any application resources. User identity is managed using Amazon Cognito, and authenticated identity information is forwarded to backend services through signed request headers. The CloudFront distribution is protected by AWS WAF which provides request filtering against common attack patterns. All traffic is served exclusively over HTTPS and backend services run within controlled network environments. Observability is implemented using metrics, logging, and tracing instrumentation. Real User Monitoring (RUM) is also integrated to capture performance telemetry from client browsers, allowing real-world usage patterns to be analysed and performance issues to be diagnosed.`,
    icon: "lock-private",
  },

  {
    title: "The First Hosted Project: TSFlap",
    description: `The first educational tool hosted on MUBox is **TSFlap**, developed as part of a Maynooth University computer science thesis. TSFlap is a TypeScript-based reimplementation of a formal languages simulator that allows users to construct and simulate computational models including Deterministic Finite Automata (DFA), Nondeterministic Finite Automata (NFA), and Turing Machines. The system enforces formal correctness rules such as deterministic transition validation, subset construction for NFA-to-DFA conversion, and correct Turing machine transition semantics. TSFlap is designed as both a standalone library and an interactive visual tool hosted on MUBox. The long-term goal is for MUBox to host additional educational tools developed by students, researchers, and contributors.`,
    icon: "star",
  },

  {
    title: "Open Source",
    description: `MUBox is an open-source project where the source code for both the platform and the hosted educational tools is publicly available. Contributions, feedback, and discussions are welcomed through the project repository. The [MUBox GitHub repository](${ExternalLinks.GITHUB_REPO}) contains the codebase, [community discussions](${ExternalLinks.GITHUB_DISCUSSIONS}) facilitate conversation, and the [issue tracker](${ExternalLinks.GITHUB_ISSUES}) is where feature requests and bug reports are managed. The long-term vision is for MUBox to grow into a collaborative ecosystem where new educational tools can be developed and shared openly.`,
    icon: "share",
  },
];

export const HomePage: FunctionComponent = () => (
  <>
    <HomePageHeader />

    {descriptionSectionsProps.map((props, index) => (
      <DescriptionSection key={index} index={index} {...props} />
    ))}
  </>
);
