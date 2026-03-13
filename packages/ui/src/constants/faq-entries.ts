import { ExternalLinks } from "./external-links";
import type { FAQEntry } from "@/types/faq";

export const muboxFaqs: FAQEntry[] = [
  {
    question: "What is MUBox?",
    answer: `MUBox is an open-source platform for hosting interactive educational tools in computer science. It was created as part of a Maynooth University thesis during the development of **TSFlap**, the first tool hosted on the platform. What began as infrastructure needed to deploy a single educational application evolved into a broader system for hosting multiple tools within a shared operational environment. MUBox therefore refers not only to the public website, but to the wider platform, engineering foundation, and long-term project vision behind it.`,
  },
  {
    question: "What is the purpose of MUBox?",
    answer: `The purpose of MUBox is to make it easier to build, deploy, and share interactive educational software through the web. Many areas of computer science are better understood through experimentation than static notes alone, particularly where behaviour emerges through execution, simulation, or stateful interaction. MUBox exists to provide a platform where such tools can be developed as serious software projects and made accessible through a common, maintainable, and reusable infrastructure layer.`,
  },
  {
    question: "Is MUBox a single application or a platform?",
    answer: `MUBox is a platform. The website at [mu-box.com](${ExternalLinks.WEBSITE}) is the public entry point, but the broader project includes the infrastructure, deployment model, engineering conventions, and hosting environment used to support educational applications. Individual tools hosted on MUBox are distinct projects which live within that platform. In other words, MUBox is the system that hosts and presents educational tools, not merely one tool by another name.`,
  },
  {
    question: "Why was MUBox created?",
    answer: `MUBox was created because the original thesis work quickly outgrew the idea of a one-off application deployment. During the redevelopment of JSFLAP into **TSFlap**, it became clear that the surrounding work required to deliver the tool properly — cloud deployment, authentication, observability, CI/CD, project structure, and operational hardening — was itself reusable. Rather than treating that effort as scaffolding for a single application, it was generalised into MUBox: a platform capable of hosting multiple educational tools built to a consistent technical standard.`,
  },
  {
    question: "What problem does MUBox attempt to solve?",
    answer: `MUBox attempts to solve two related problems. The first is educational: many technical topics are easier to understand through interactive experimentation than through passive study alone. The second is engineering: building and publicly deploying such tools repeatedly from scratch is inefficient and creates unnecessary duplication of effort. MUBox addresses the first problem by providing a home for interactive tools, and the second by supplying a shared platform layer on which those tools can be hosted.`,
  },
  {
    question: "Who is MUBox for?",
    answer: `MUBox is intended for students, educators, and technically curious users who want to explore computer science concepts through interactive software. It is especially relevant to learners who benefit from constructing, simulating, visualising, or experimenting with computational systems directly. At the same time, it is also designed for contributors — including students and developers — who may wish to build new educational tools and deploy them within a shared open-source platform.`,
  },
  {
    question: "Is MUBox only for Maynooth University?",
    answer: `No. MUBox originated in the context of a Maynooth University thesis, and that academic context remains central to its identity, but the platform itself is not limited to a single institution. It is publicly accessible, open source, and designed so that the educational tools it hosts can be useful to anyone with an interest in the underlying subject matter. The long-term value of the platform depends on the tools being broadly accessible rather than institutionally siloed.`,
  },
  {
    question: "Is MUBox open source?",
    answer: `Yes. MUBox is an open-source project, and its source code is publicly available through the [GitHub repository](${ExternalLinks.GITHUB_REPO}). This is an intentional design choice rather than an afterthought. Educational tooling benefits from transparency: users can inspect how a tool works, contributors can propose improvements, and the platform itself can evolve through public collaboration rather than existing as an opaque hosted system.`,
  },
  {
    question: "Why was MUBox made open source?",
    answer: `MUBox was made open source because the project is intended to be inspectable, extensible, and useful beyond its original thesis context. An educational platform gains credibility when its implementation can be examined directly, particularly when the tools it hosts are themselves intended to support learning. Open sourcing the platform also lowers the barrier to contribution, makes architectural decisions easier to study, and allows the work to persist as a reusable body of engineering rather than a closed academic artefact.`,
  },
  {
    question: "What kind of projects are meant to live on MUBox?",
    answer: `MUBox is intended to host interactive educational tools related to computing and adjacent technical subjects. These may include simulators, visualisers, teaching aids, experimentation environments, or other applications where interactivity materially improves understanding. The common thread is not a specific sub-discipline, but the idea that the hosted project should provide meaningful educational value through software rather than existing purely as static content.`,
  },
  {
    question: "Is MUBox just a website for documentation?",
    answer: `No. Although MUBox includes documentation and explanatory content, it is not simply a documentation website. Its central purpose is to host functioning educational applications within a shared platform environment. Documentation is part of the overall experience because educational tools benefit from surrounding context, but the platform is fundamentally oriented around deployed software, not just descriptive pages.`,
  },
  {
    question: "How does MUBox differ from a typical thesis project website?",
    answer: `A typical thesis project website is often a thin presentation layer for a single artefact. MUBox is materially broader. It includes a reusable hosting model, a formal deployment architecture, authentication, observability, CI/CD, and an explicit intention to support multiple educational tools over time. While it originated through thesis work, it is structured as a platform and body of engineering work rather than a one-off promotional site for a single deliverable.`,
  },
  {
    question: "What makes MUBox more than a proof of concept?",
    answer: `MUBox is more than a proof of concept because it is designed as an operational platform rather than a disposable demonstration. The project includes a defined infrastructure model, deployment automation, authentication, security controls, observability, and a clear separation between the platform and the educational tools it hosts. Those characteristics indicate an intention toward maintainability and reuse rather than a temporary implementation built only to validate an idea.`,
  },
  {
    question: "What is hosted on MUBox today?",
    answer: `The first educational tool hosted on MUBox is **TSFlap**, which was developed as part of the thesis work that led to the platform itself. TSFlap has its own dedicated page and documentation within MUBox. The platform is designed so that additional tools can be integrated over time without requiring the entire surrounding infrastructure to be reinvented for each new project.`,
  },
  {
    question: "Does MUBox only exist because of TSFlap?",
    answer: `TSFlap was the catalyst for MUBox, but MUBox now stands as its own project. Without TSFlap there would likely have been no immediate reason to build the platform, but once the surrounding deployment and engineering concerns were abstracted into reusable components, the result became larger than the original tool. TSFlap is therefore the first hosted application on MUBox, not the full definition of MUBox itself.`,
  },
  {
    question: "What does it mean that MUBox is a platform?",
    answer: `In this context, calling MUBox a platform means it provides shared capabilities that individual hosted tools inherit. Those capabilities include the public website, deployment infrastructure, authentication model, operational environment, and common engineering foundation. This allows new tools to be integrated into an existing system rather than being forced to recreate the same supporting infrastructure independently.`,
  },
  {
    question: "What technologies define MUBox at a high level?",
    answer: `At a high level, MUBox is implemented as a TypeScript-based web platform deployed on AWS. The frontend is built with [React](${ExternalLinks.REACT}), backend functionality is provided through [AWS Lambda](${ExternalLinks.AWS_LAMBDA}), the public web layer is distributed via [Amazon CloudFront](${ExternalLinks.AWS_CLOUDFRONT}), authentication is handled using [Amazon Cognito](${ExternalLinks.AWS_COGNITO}) and [Lambda@Edge](${ExternalLinks.AWS_LAMBDA_EDGE}), infrastructure is defined using [AWS CDK](${ExternalLinks.AWS_CDK}), and the broader project follows a monorepo model supported by [Nx](${ExternalLinks.NX}). More detailed architectural explanation is covered on the dedicated architecture page.`,
  },
  {
    question: "Why does MUBox emphasise engineering quality so heavily?",
    answer: `MUBox emphasises engineering quality because educational software still benefits from being built as real software. If a platform is intended to host public tools, support future contributors, and remain useful beyond the life of a single thesis submission, then maintainability, security, deployment discipline, and operational visibility are not decorative concerns. They are part of what makes the project credible and reusable. The intention is not to over-engineer for appearance, but to treat the platform as a serious system with long-term utility.`,
  },
  {
    question: "Is MUBox intended to continue after the thesis is finished?",
    answer: `Yes. A central goal of the project is that MUBox should remain useful beyond the thesis in which it originated. The platform is structured so that it can continue to host tools, accept improvements, and evolve over time. Open sourcing the project, separating the platform from any one hosted tool, and documenting the system properly are all part of making that continuation realistic rather than merely aspirational.`,
  },
  {
    question: "What stage of development is MUBox currently in?",
    answer: `MUBox is in active development as a live platform with its first hosted educational tool already integrated. The core identity of the project is established: the website, platform architecture, and thesis-driven foundation are in place. Future work is focused on expanding hosted content, refining contributor experience, deepening documentation, and continuing to improve the platform as a reusable environment for educational applications.`,
  },
  {
    question: "Where should I go next if I want to learn more?",
    answer: `That depends on what you want to understand. If you want to understand how the platform is engineered, the dedicated Architecture page is the right place to start. If you want to understand how to contribute, the Contribute page is the correct next step. If you want to inspect the code directly, the [MUBox GitHub repository](${ExternalLinks.GITHUB_REPO}) is the canonical source. For questions, proposals, or discussion, the [Discussions page](${ExternalLinks.GITHUB_DISCUSSIONS}) and [Issue tracker](${ExternalLinks.GITHUB_ISSUES}) are the best public channels.`,
  },
];

export const whyFaqs: FAQEntry[] = [
  {
    question: "Why does MUBox exist?",
    answer: `MUBox exists because many areas of computer science are easier to understand through experimentation than through static explanations alone. Concepts such as automata behaviour, algorithmic state transitions, distributed systems dynamics, or execution semantics often become clearer when they can be constructed and observed interactively. While textbooks and lectures provide the theoretical foundation, interactive tools allow learners to actively explore the behaviour of those systems. MUBox was created to provide a platform where such tools can be developed, deployed, and shared through the web.`,
  },

  {
    question: "Why build a platform instead of a single tool?",
    answer: `The original thesis work focused on building a single educational tool. However, during development it became clear that a significant amount of engineering effort was required outside the tool itself: infrastructure provisioning, authentication, deployment pipelines, operational monitoring, and web hosting. Treating that work as scaffolding for a single application would have meant repeating the same effort for every future tool. MUBox therefore emerged as a platform abstraction: a shared operational foundation capable of hosting multiple educational applications rather than only one.`,
  },

  {
    question: "Why not just host tools as independent websites?",
    answer: `Hosting every educational tool as a completely independent website creates unnecessary duplication of effort. Each project would need to solve the same engineering problems repeatedly: authentication, deployment automation, monitoring, and infrastructure configuration. By providing a shared platform layer, MUBox allows those concerns to be solved once and reused across multiple tools. This approach reduces engineering overhead for new projects while maintaining a consistent operational environment.`,
  },

  {
    question: "Why focus on interactive educational tools?",
    answer: `Interactive tools occupy a unique position in technical education. Many concepts in computer science involve dynamic systems whose behaviour emerges through execution rather than through static definitions. Simulation environments, visualisation tools, and experimentation interfaces allow learners to explore those systems directly. By hosting such tools in a publicly accessible environment, MUBox attempts to complement traditional learning materials rather than replace them.`,
  },

  {
    question: "Why not simply rely on existing tools?",
    answer: `Existing tools such as [JSFLAP](${ExternalLinks.JSFLAP_WEBSITE}) have played an important role in education and remain widely used. However, many of these systems were developed in earlier technological contexts and were not designed with modern web deployment, extensibility, or collaborative open-source development in mind. MUBox does not attempt to replace those tools outright. Instead, it provides a modern platform environment in which new tools — including modern reimplementations of existing ideas — can be developed and deployed more easily.`,
  },

  {
    question: "Why make the platform publicly accessible?",
    answer: `Educational tools become significantly more useful when they are accessible through the web rather than confined to local installations or internal academic systems. A publicly accessible platform allows students, educators, and developers to interact with the tools directly without requiring specialised setup. It also allows the surrounding documentation, discussions, and contributions to happen in a shared environment rather than being fragmented across multiple isolated deployments.`,
  },

  {
    question: "Why treat this as a serious software project instead of a small academic prototype?",
    answer: `Many academic software projects are built primarily to demonstrate an idea rather than to operate as durable systems. MUBox takes a different approach by treating the platform as a maintainable software system from the beginning. This includes automated deployments, infrastructure defined as code, authentication, monitoring, and testing. These choices are not made purely for technical novelty; they reflect the intention that the platform should remain usable and extensible beyond the timeframe of a single thesis project.`,
  },

  {
    question: "Why use open-source development for MUBox?",
    answer: `Open-source development aligns well with the goals of an educational platform. It allows users to inspect how the platform and its tools are implemented, encourages contributions from outside the original development team, and ensures that the project can continue evolving over time. Making the code publicly available through the [MUBox GitHub repository](${ExternalLinks.GITHUB_REPO}) also allows the project to function as a learning resource in its own right.`,
  },

  {
    question: "Why build MUBox using modern cloud infrastructure?",
    answer: `Deploying MUBox using modern cloud infrastructure allows the platform to provide global availability, automated scalability, and simplified operational management. Services such as [Amazon CloudFront](${ExternalLinks.AWS_CLOUDFRONT}), [AWS Lambda](${ExternalLinks.AWS_LAMBDA}), and [Amazon Cognito](${ExternalLinks.AWS_COGNITO}) enable the system to operate without maintaining traditional server infrastructure. This makes the platform easier to operate while still supporting production-quality deployment practices.`,
  },

  {
    question: "Why emphasise maintainability and extensibility?",
    answer: `The long-term usefulness of an educational platform depends on its ability to evolve. If every new tool requires fundamental changes to the surrounding infrastructure, the platform quickly becomes difficult to maintain. MUBox attempts to avoid this problem by separating the platform layer from the individual educational tools it hosts. This separation allows tools to be developed independently while still benefiting from the shared infrastructure and operational environment provided by the platform.`,
  },

  {
    question: "Why should students or developers care about MUBox?",
    answer: `For students, MUBox provides access to interactive tools that help explore technical concepts more actively. For developers and contributors, it provides a structured environment where new educational software can be deployed without rebuilding the entire surrounding infrastructure. In both cases the platform attempts to lower the barrier between an interesting technical idea and a publicly accessible tool that others can use and learn from.`,
  },

  {
    question: "Why might platforms like MUBox matter in the long term?",
    answer: `Educational software ecosystems often struggle to persist because they are tied to individual projects or researchers. When those projects conclude, the surrounding infrastructure frequently disappears with them. By structuring MUBox as a platform rather than a single application, the goal is to make it easier for the system to continue evolving over time. If new tools can be added without rebuilding the platform itself, the project becomes more sustainable and more valuable as a shared educational resource.`,
  },
];

export const developmentFaqs: FAQEntry[] = [
  {
    question: "What technologies are used to build MUBox?",
    answer: `MUBox is built primarily using [TypeScript](${ExternalLinks.TYPESCRIPT}) across the entire stack. The frontend is implemented with [React](${ExternalLinks.REACT}), backend services run on [AWS Lambda](${ExternalLinks.AWS_LAMBDA}), infrastructure is defined using [AWS CDK](${ExternalLinks.AWS_CDK}), and the repository is organised as a monorepo using [Nx](${ExternalLinks.NX}). API communication between frontend and backend uses [tRPC](${ExternalLinks.TRPC}) to provide end-to-end type safety, while runtime data validation is implemented using [Zod](${ExternalLinks.ZOD}).`,
  },

  {
    question: "Why was TypeScript chosen as the primary language?",
    answer: `TypeScript provides strong static typing while maintaining compatibility with the broader JavaScript ecosystem. Because MUBox includes frontend code, backend services, and infrastructure definitions, using a single language across the entire stack simplifies development and reduces context switching. TypeScript also allows types to be shared between different parts of the system, which helps prevent integration errors between the frontend and backend layers.`,
  },

  {
    question: "Why does MUBox use a monorepo?",
    answer: `MUBox uses a monorepo structure to keep related components of the platform within a single repository while still maintaining clear boundaries between them. This approach allows shared utilities, type definitions, and tooling to be reused across projects while still enabling independent development of platform components and hosted tools. The monorepo is managed using [Nx](${ExternalLinks.NX}), which provides dependency graph analysis, incremental builds, and task orchestration.`,
  },

  {
    question: "How is the MUBox repository organised?",
    answer: `The repository is organised into separate projects representing different parts of the platform. These include the web frontend, backend services, infrastructure definitions, and hosted educational tools. Shared libraries provide common functionality such as type definitions, validation schemas, and utilities. This structure allows each part of the system to evolve independently while still maintaining strong integration through shared interfaces.`,
  },

  {
    question: "How does frontend and backend communication work?",
    answer: `Communication between the frontend and backend is implemented using [tRPC](${ExternalLinks.TRPC}). Instead of defining APIs through manually written REST endpoints or separate schema definitions, tRPC allows backend procedures to be exposed directly as type-safe functions that can be called from the frontend. Because both sides share the same TypeScript types, request and response structures are validated at compile time, reducing the likelihood of runtime API mismatches.`,
  },

  {
    question: "Why use Zod for validation?",
    answer: `[Zod](${ExternalLinks.ZOD}) is used to perform runtime schema validation for data structures exchanged within the system. While TypeScript provides compile-time type checking, it cannot guarantee the shape of data received at runtime, particularly from external inputs. Zod allows schemas to be defined alongside TypeScript types and validated during execution, ensuring that runtime data matches the expected structure.`,
  },

  {
    question: "How are dependencies managed within the project?",
    answer: `Dependencies are managed through the standard Node.js package ecosystem using package manifests within the repository. Because the project uses a monorepo, shared dependencies and development tooling can be centralised, reducing duplication between individual packages. Nx also provides tooling to ensure that dependencies between projects remain well defined and that builds occur in the correct order.`,
  },

  {
    question: "How is testing implemented in MUBox?",
    answer: `Automated testing is implemented using [Vitest](${ExternalLinks.VITEST}), a modern testing framework designed for TypeScript and modern frontend tooling. Unit tests are used to validate the behaviour of individual modules and shared libraries. These tests run automatically as part of the development workflow and the CI/CD pipeline, ensuring that regressions are detected before changes are deployed.`,
  },

  {
    question: "How does the development workflow typically work?",
    answer: `Development typically occurs by implementing changes within the relevant project in the monorepo, running local builds and tests to verify behaviour, and then committing changes to the repository. The CI/CD pipeline automatically builds, tests, and deploys the platform when updates are pushed. This workflow ensures that the platform can evolve continuously while maintaining a reproducible deployment process.`,
  },

  {
    question: "Can MUBox be run locally for development?",
    answer: `Yes. The repository contains the full implementation of the platform, allowing developers to run the frontend application and supporting services locally for development and testing. Because the system relies on cloud infrastructure for certain features, some capabilities may require cloud resources during testing, but the overall development workflow is designed so that most work can be performed locally before deployment.`,
  },

  {
    question: "How are infrastructure changes developed safely?",
    answer: `Infrastructure changes are defined using [AWS CDK](${ExternalLinks.AWS_CDK}) and version controlled alongside the rest of the project. This allows infrastructure modifications to be reviewed, tested, and deployed using the same processes as application code. Defining infrastructure as code ensures that environments remain reproducible and that configuration changes are tracked through the repository history.`,
  },

  {
    question: "How does MUBox support future educational tools?",
    answer: `The platform is designed so that educational tools can be integrated as independent projects within the repository. Because the platform provides shared capabilities such as authentication, hosting, and deployment infrastructure, new tools can focus primarily on their own domain logic and user interface. This separation allows the platform to grow organically as additional educational tools are developed and integrated over time.`,
  },

  {
    question: "Where can I explore the codebase?",
    answer: `The full MUBox codebase is available through the [MUBox GitHub repository](${ExternalLinks.GITHUB_REPO}). The repository contains the platform implementation, infrastructure definitions, and the hosted educational tools. Exploring the repository is the best way to understand how the platform is structured and how its various components interact.`,
  },
];

export const architectureFaqs: FAQEntry[] = [
  {
    question: "What does the high-level architecture of MUBox look like?",
    answer: `MUBox follows a modern web architecture composed of three primary layers: the frontend application, the edge distribution layer, and serverless backend services. The user-facing interface is delivered as a static web application built with [React](${ExternalLinks.REACT}) and distributed globally through [Amazon CloudFront](${ExternalLinks.AWS_CLOUDFRONT}). Authentication enforcement occurs at the edge using [Lambda@Edge](${ExternalLinks.AWS_LAMBDA_EDGE}) before requests reach application resources. Backend functionality is implemented using [AWS Lambda](${ExternalLinks.AWS_LAMBDA}), which provides serverless execution for API endpoints. Infrastructure is defined using [AWS CDK](${ExternalLinks.AWS_CDK}), allowing the entire platform to be managed through infrastructure-as-code and deployed automatically through a CI/CD pipeline.`,
  },

  {
    question: "Why was a serverless architecture chosen for MUBox?",
    answer: `A serverless architecture was chosen because it significantly reduces operational complexity while still providing strong scalability characteristics. Services such as [AWS Lambda](${ExternalLinks.AWS_LAMBDA}) and [Amazon CloudFront](${ExternalLinks.AWS_CLOUDFRONT}) scale automatically in response to traffic, eliminating the need to provision or maintain traditional server infrastructure. For an educational platform where traffic patterns may vary and operational overhead should remain minimal, serverless services provide an effective balance between reliability, cost efficiency, and maintainability.`,
  },

  {
    question: "Why is CloudFront used as the primary entry point for the platform?",
    answer: `CloudFront serves as the public entry point because it provides global edge distribution, TLS termination, and request routing capabilities in a single service. Static frontend assets are cached at edge locations worldwide, allowing users to load the application with low latency regardless of geographic location. In addition to content distribution, CloudFront allows request processing to occur at the edge through [Lambda@Edge](${ExternalLinks.AWS_LAMBDA_EDGE}), which MUBox uses to enforce authentication before requests reach backend services.`,
  },

  {
    question: "How does authentication work at the architectural level?",
    answer: `Authentication is implemented using [Amazon Cognito](${ExternalLinks.AWS_COGNITO}) combined with a custom interceptor executed through [Lambda@Edge](${ExternalLinks.AWS_LAMBDA_EDGE}). When a request arrives at the CloudFront distribution, the interceptor validates whether the user has a valid authentication session. If the user is not authenticated, they are redirected to the Cognito hosted login flow. Once authentication succeeds, a secure session cookie is issued and subsequent requests are validated at the edge before being allowed to reach the application.`,
  },

  {
    question: "Why is authentication enforced at the edge rather than inside the backend?",
    answer: `Enforcing authentication at the edge provides both security and performance benefits. Because authentication occurs within CloudFront through Lambda@Edge, unauthenticated requests are intercepted before they reach any backend services. This reduces unnecessary load on backend infrastructure while also ensuring that protected resources are never exposed without proper identity validation. It also allows authentication logic to be applied consistently across all routes served through the distribution.`,
  },

  {
    question: "How are backend APIs implemented in MUBox?",
    answer: `Backend APIs are implemented using [AWS Lambda](${ExternalLinks.AWS_LAMBDA}) and exposed through CloudFront. The API layer is written in [TypeScript](${ExternalLinks.TYPESCRIPT}) and uses [tRPC](${ExternalLinks.TRPC}) to provide end-to-end type-safe communication between the frontend and backend. Because the frontend and backend share TypeScript types, API contracts are validated at compile time, reducing the likelihood of runtime integration errors.`,
  },

  {
    question: "Why was tRPC chosen instead of REST or GraphQL?",
    answer: `tRPC was chosen primarily because of its strong integration with TypeScript. Traditional REST APIs require manually maintaining request and response schemas, while GraphQL typically introduces schema definitions and code generation workflows. In contrast, [tRPC](${ExternalLinks.TRPC}) allows the frontend and backend to share TypeScript types directly. This approach significantly simplifies development while maintaining strong type safety across the entire application stack.`,
  },

  {
    question: "How is infrastructure managed in the MUBox platform?",
    answer: `All infrastructure used by MUBox is defined programmatically using [AWS CDK](${ExternalLinks.AWS_CDK}). Instead of configuring cloud resources manually through the AWS console, infrastructure components such as CloudFront distributions, Lambda functions, authentication services, and networking configuration are defined in code. This approach enables infrastructure to be version controlled alongside the application code and deployed reproducibly through automated pipelines.`,
  },

  {
    question: "How does the CI/CD pipeline work?",
    answer: `The MUBox deployment pipeline is designed to automatically build, test, and deploy infrastructure and application code. When changes are pushed to the repository, the pipeline performs dependency installation, project compilation, automated testing, and infrastructure synthesis using AWS CDK. Once these steps succeed, the pipeline deploys the updated infrastructure and application components to the appropriate environment. This process ensures that deployments are reproducible and reduces the likelihood of configuration drift between environments.`,
  },

  {
    question: "How does MUBox ensure the platform can scale?",
    answer: `Scalability is primarily achieved through the use of managed cloud services that automatically scale based on demand. [Amazon CloudFront](${ExternalLinks.AWS_CLOUDFRONT}) distributes static assets through edge caching, while [AWS Lambda](${ExternalLinks.AWS_LAMBDA}) automatically scales the number of backend execution environments in response to incoming requests. Because these services are fully managed, MUBox can support large variations in traffic without requiring manual scaling operations.`,
  },

  {
    question: "How are frontend assets delivered to users?",
    answer: `The MUBox frontend is built as a static web application using [React](${ExternalLinks.REACT}). The compiled application bundle is uploaded to cloud storage and served through the CloudFront distribution. CloudFront caches static assets at edge locations around the world, allowing users to download application resources from a location geographically close to them. This approach reduces latency and improves overall application responsiveness.`,
  },

  {
    question: "How is observability implemented in the architecture?",
    answer: `Observability in MUBox is implemented through a combination of logging, metrics, and client-side telemetry. Backend services emit structured logs and metrics during execution, allowing operational behaviour to be analysed. Additionally, Real User Monitoring (RUM) is integrated using [Amazon CloudWatch RUM](${ExternalLinks.AWS_RUM}), which collects performance telemetry from users' browsers. This allows the platform to monitor real-world performance characteristics such as page load times and resource latency.`,
  },

  {
    question: "How does the architecture support multiple educational tools?",
    answer: `MUBox separates the platform infrastructure from the individual tools it hosts. The platform provides the shared capabilities required to deliver applications through the web — including authentication, deployment infrastructure, and frontend hosting — while the educational tools themselves remain independent projects integrated into the platform. This separation allows new tools to be added without requiring major changes to the underlying infrastructure.`,
  },

  {
    question: "Where can I learn more about the architecture?",
    answer: `This FAQ provides a conceptual overview of the platform architecture. For a deeper technical explanation, including diagrams and implementation details, the dedicated Architecture page should be consulted. The platform source code available in the [MUBox GitHub repository](${ExternalLinks.GITHUB_REPO}) also provides a complete reference implementation of the architecture described here.`,
  },
];

export const securityFaqs: FAQEntry[] = [
  {
    question: "How is MUBox secured at a high level?",
    answer: `MUBox uses a layered security model combining identity management, edge request interception, network protections, and application-level safeguards. Authentication is handled through [Amazon Cognito](${ExternalLinks.AWS_COGNITO}), while request interception occurs at the edge using [Lambda@Edge](${ExternalLinks.AWS_LAMBDA_EDGE}) before requests reach application resources. Traffic is served exclusively over HTTPS through [Amazon CloudFront](${ExternalLinks.AWS_CLOUDFRONT}), and request filtering is enforced using [AWS WAF](${ExternalLinks.AWS_WAF}). Together these components ensure that identity verification, traffic filtering, and request handling occur before backend services are reached.`,
  },

  {
    question: "How does user authentication work?",
    answer: `User authentication is implemented using [Amazon Cognito](${ExternalLinks.AWS_COGNITO}). When an unauthenticated user attempts to access the platform, the request is intercepted at the edge and the user is redirected to the Cognito hosted authentication flow. After successful authentication, Cognito returns a signed identity token which is stored in a secure session cookie. Subsequent requests include this cookie and are validated by the edge interceptor before being allowed to reach application resources.`,
  },

  {
    question: "Why is authentication enforced at the edge?",
    answer: `Authentication is enforced at the edge through [Lambda@Edge](${ExternalLinks.AWS_LAMBDA_EDGE}) so that requests are validated before they reach any backend infrastructure. This design ensures that unauthenticated traffic is filtered immediately at the CloudFront distribution rather than allowing unauthenticated requests to reach application services. In addition to reducing backend load, this approach ensures that protected resources cannot be accessed unless identity validation has already occurred.`,
  },

  {
    question: "How are API endpoints protected?",
    answer: `API endpoints are protected through the same authentication mechanism that protects the rest of the platform. Because requests must pass through the edge authentication interceptor before reaching backend services, all API calls are validated against the authenticated session associated with the user. Backend services can therefore rely on the presence of a trusted identity header injected by the interceptor rather than implementing authentication logic independently.`,
  },

  {
    question: "How does MUBox protect against common web attacks?",
    answer: `MUBox relies on multiple protections against common web threats. [AWS WAF](${ExternalLinks.AWS_WAF}) is used to filter malicious requests and block known attack patterns before they reach application resources. HTTPS encryption enforced by [Amazon CloudFront](${ExternalLinks.AWS_CLOUDFRONT}) protects data in transit. Additionally, the application frontend is implemented using [React](${ExternalLinks.REACT}), which escapes dynamic content by default and reduces the likelihood of common injection vulnerabilities such as cross-site scripting.`,
  },

  {
    question: "How does MUBox mitigate cross-site scripting (XSS)?",
    answer: `Cross-site scripting risks are mitigated primarily through safe rendering practices in the frontend and through browser-level security policies. Because the MUBox frontend is built using [React](${ExternalLinks.REACT}), dynamic content is escaped by default before being rendered into the DOM. This prevents injected HTML or JavaScript from being executed unintentionally. Additional protections can be applied through HTTP security headers that restrict script execution sources.`,
  },

  {
    question: "How does MUBox mitigate cross-site request forgery (CSRF)?",
    answer: `Cross-site request forgery attacks are mitigated through the use of secure authentication cookies and controlled request routing. Session cookies are configured with attributes such as Secure and SameSite, which prevent them from being sent in cross-origin contexts where they should not be included. Because authentication is validated at the edge before requests reach backend services, forged requests without a valid authenticated session are rejected before being processed.`,
  },

  {
    question: "How are authentication tokens handled securely?",
    answer: `Authentication tokens issued during the Cognito login process are stored in secure cookies rather than exposed directly to client-side JavaScript. These cookies are configured with Secure and HttpOnly attributes, ensuring that they are transmitted only over encrypted HTTPS connections and cannot be accessed through browser scripts. This reduces the risk of token leakage through client-side vulnerabilities.`,
  },

  {
    question: "How does MUBox ensure secure communication between users and the platform?",
    answer: `All communication with MUBox occurs over encrypted HTTPS connections. [Amazon CloudFront](${ExternalLinks.AWS_CLOUDFRONT}) terminates TLS connections and ensures that traffic between users and the platform is encrypted in transit. Enforcing HTTPS prevents attackers from intercepting or modifying network traffic through man-in-the-middle attacks.`,
  },

  {
    question: "How are backend services isolated from the public internet?",
    answer: `Backend services are not exposed directly to the public internet. Instead, requests must pass through the CloudFront distribution and the edge authentication layer before reaching application endpoints. This architecture reduces the attack surface by ensuring that backend services cannot be accessed directly without first passing through the platform's security controls.`,
  },

  {
    question: "How does MUBox detect operational or security issues?",
    answer: `Operational visibility is provided through logging, metrics, and monitoring instrumentation. Backend services emit structured logs and operational metrics that allow errors and abnormal behaviour to be detected. Additionally, client-side telemetry is collected using [Amazon CloudWatch RUM](${ExternalLinks.AWS_RUM}), which provides insight into how the platform behaves under real-world usage conditions. These signals help identify both operational issues and potential abuse patterns.`,
  },

  {
    question: "Does MUBox follow any particular security philosophy?",
    answer: `MUBox follows a defence-in-depth philosophy where multiple independent protections are applied across different layers of the system. Identity verification, edge request interception, HTTPS encryption, request filtering, and secure token handling all contribute to the overall security posture. While no system can claim to eliminate all risk, layering these controls significantly reduces the likelihood of common web vulnerabilities being exploited.`,
  },

  {
    question: "Is MUBox intended to meet enterprise security standards?",
    answer: `MUBox is an educational platform rather than an enterprise SaaS product, but it is designed using many of the same architectural security practices that modern production systems employ. These include identity-based authentication, encrypted communication, infrastructure defined as code, and layered request filtering. The goal is not to replicate enterprise compliance frameworks, but to build the platform according to sound engineering and security principles.`,
  },

  {
    question: "Where can I learn more about the security model?",
    answer: `This FAQ provides a high-level overview of how MUBox approaches platform security. For a deeper explanation of the architectural components involved, the Architecture page provides additional context. The complete implementation can also be inspected directly through the [MUBox GitHub repository](${ExternalLinks.GITHUB_REPO}), where the infrastructure and application code are publicly available.`,
  },
];

export const platformFaqs: FAQEntry[] = [
  {
    question: "Do I need an account to use MUBox?",
    answer: `Some areas of the platform may require authentication depending on the capabilities of the hosted tool. MUBox uses [Amazon Cognito](${ExternalLinks.AWS_COGNITO}) to manage user identity when authentication is required. Many educational tools can still be explored without an account, but authentication allows the platform to support features such as persistent sessions, saved work, or personalised functionality depending on the tool being used.`,
  },

  {
    question: "Is MUBox free to use?",
    answer: `Yes. MUBox is intended to be an openly accessible educational platform. The tools hosted on the platform are designed to support learning and experimentation rather than commercial use. Because the platform is open source and publicly available, anyone can access the hosted tools and inspect the underlying implementation through the [MUBox GitHub repository](${ExternalLinks.GITHUB_REPO}).`,
  },

  {
    question: "What kinds of tools can be hosted on MUBox?",
    answer: `MUBox is designed to host interactive educational tools related to computer science and adjacent technical disciplines. These tools may include simulators, visualisation environments, experimentation platforms, or interactive learning resources where direct interaction improves conceptual understanding. The defining characteristic is that the hosted application provides meaningful educational value through interactive behaviour rather than static content.`,
  },

  {
    question: "Are the tools on MUBox open source?",
    answer: `The intention of the platform is that hosted tools are open source whenever possible. Open sourcing educational tools allows users to inspect their implementation, learn from the underlying code, and contribute improvements. Because MUBox itself is open source, maintaining transparency across hosted tools aligns with the broader philosophy of the platform.`,
  },

  {
    question: "What browsers are supported?",
    answer: `MUBox is designed to operate in modern web browsers that support contemporary JavaScript and web standards. Because the frontend is built using [React](${ExternalLinks.REACT}) and delivered as a standard web application through [Amazon CloudFront](${ExternalLinks.AWS_CLOUDFRONT}), the platform works best on up-to-date versions of major browsers such as Chrome, Firefox, Safari, and Edge.`,
  },

  {
    question: "Does MUBox support mobile devices?",
    answer: `MUBox is accessible from mobile browsers, but the usability of individual tools depends on their interface design. Many educational tools involve visualisation interfaces or interactive editing environments that are better suited to larger displays. As the platform evolves, improving responsive design for smaller devices remains an area of ongoing consideration.`,
  },

  {
    question: "How can I report issues with the platform or a tool?",
    answer: `Issues can be reported through the project's public issue tracker. If you encounter bugs, unexpected behaviour, or usability problems, the best place to report them is the [MUBox issue tracker](${ExternalLinks.GITHUB_ISSUES}). Providing clear descriptions, screenshots, or reproduction steps helps maintainers diagnose and resolve problems more effectively.`,
  },

  {
    question: "Where can I discuss ideas or ask questions about MUBox?",
    answer: `General discussion about the platform, potential improvements, or new tool ideas can take place through the [MUBox GitHub Discussions page](${ExternalLinks.GITHUB_DISCUSSIONS}). This provides a public forum where contributors, users, and developers can exchange ideas about the platform and its future development.`,
  },

  {
    question: "Is MUBox intended to replace traditional learning materials?",
    answer: `No. MUBox is intended to complement traditional learning materials rather than replace them. Lectures, textbooks, and formal coursework provide the theoretical foundation of computer science education. Interactive tools hosted on MUBox provide an additional layer that allows learners to explore those concepts through experimentation and visualisation.`,
  },

  {
    question: "How are new tools added to MUBox?",
    answer: `New tools can be added through the platform's development workflow by integrating them into the repository and deployment infrastructure. Because MUBox is structured as a platform rather than a single application, new tools can be integrated without fundamentally altering the surrounding infrastructure. The Contribute page provides guidance for developers who wish to propose or implement new educational tools within the platform.`,
  },
];

export const futureFaqs: FAQEntry[] = [
  {
    question: "What is the long-term vision for MUBox?",
    answer: `The long-term vision for MUBox is to become a platform that hosts a growing ecosystem of interactive educational tools related to computer science and software engineering. Rather than existing as a single-purpose application, MUBox is intended to function as a shared environment where new tools can be developed, deployed, and maintained over time. By separating the platform infrastructure from the individual tools it hosts, the system can evolve gradually as new projects are introduced.`,
  },

  {
    question: "Will more tools be added to the platform?",
    answer: `Yes. The first educational tool hosted on MUBox is TSFlap, but the platform was explicitly designed to support additional tools in the future. As new educational projects are developed, they can be integrated into the platform so that users can access them through a shared environment rather than through unrelated standalone deployments.`,
  },

  {
    question: "Can contributors create their own tools for MUBox?",
    answer: `Yes. One of the motivations behind building MUBox as an open-source platform is to allow contributors to propose and develop new educational tools. Because the platform provides shared infrastructure such as authentication, hosting, and deployment automation, contributors can focus primarily on the functionality of the tool itself rather than the surrounding operational environment.`,
  },

  {
    question: "Could MUBox be used by other universities or educators?",
    answer: `Yes. Although the platform originated from a thesis project at Maynooth University, it is not limited to a single institution. Because MUBox is open source and publicly accessible, educators and developers from other institutions can use the platform, study its implementation, or build similar systems inspired by its architecture.`,
  },

  {
    question: "How might MUBox evolve over time?",
    answer: `Future development may include additional educational tools, improvements to the platform architecture, expanded documentation, and enhanced contributor workflows. Because the system is built using modern development practices such as infrastructure-as-code and automated deployment pipelines, the platform can evolve incrementally without requiring large-scale redesigns.`,
  },

  {
    question: "Does MUBox aim to become a large educational ecosystem?",
    answer: `The project does not attempt to predict the scale it may eventually reach, but the platform architecture is intentionally designed to support growth. By treating MUBox as a reusable platform rather than a single application, the project leaves open the possibility that more educational tools, contributors, and use cases may emerge over time.`,
  },

  {
    question: "What role did the thesis play in the creation of MUBox?",
    answer: `The thesis served as the catalyst for the platform's creation. The original academic objective involved building an improved educational tool for exploring formal languages and automata. During development, the surrounding infrastructure required to deploy the tool evolved into a reusable system capable of hosting multiple tools. MUBox therefore emerged as a natural extension of the thesis work rather than a separate project conceived independently.`,
  },

  {
    question: "What might future research around MUBox explore?",
    answer: `Future research could examine how interactive educational platforms influence student engagement, how distributed educational tools can be maintained collaboratively through open-source development, and how platform-based approaches compare to traditional standalone educational software. Because MUBox combines software engineering practices with educational tooling, it sits at the intersection of computing education research and modern web platform design.`,
  },

  {
    question: "How can the project continue after the thesis is completed?",
    answer: `By publishing the platform as an open-source project and documenting its architecture, MUBox is designed so that development can continue beyond the original thesis work. Contributors can extend the platform, new educational tools can be added, and the system can evolve as a collaborative project rather than remaining tied to a single academic submission.`,
  },
];
