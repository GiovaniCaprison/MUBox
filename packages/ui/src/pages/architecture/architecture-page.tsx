import Button from "@cloudscape-design/components/button";
import type { FunctionComponent } from "react";

import architectureDiagram from "./mubox-architecture-diagram.xml?url";
import architectureImage from "./mubox-architecture.png";
import pipelineImage from "./mubox-pipeline.png";
import { LinkableSection } from "@/components/linkable-section";
import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/page-header";
import { PageSectionContent } from "@/components/page-section-content";

export const ArchitecturePage: FunctionComponent = () => (
  <>
    <PageHeader
      actions={
        <Button
          ariaLabel="Downloads an XML copy of the architecture diagram"
          href={architectureDiagram}
          iconName="download"
          download="architecture-diagram.xml"
        >
          Download Diagram
        </Button>
      }
    />

    <PageSectionContent>
      <img alt="Architecture" src={architectureImage} className="my-8 w-auto" />
      <Markdown>
        Above diagram illustrates the runtime architecture of MUBox, showing how requests travel from users through the global edge network
        and into the platforms backend services.
      </Markdown>
      <LinkableSection title="1. Public Internet">
        <Markdown>
          MUBox is accessed through the public internet via the **mu-box.com** domain. Users interact with the platform using a standard web
          browser without requiring VPN access or specialised network configuration. All requests originate from the users device and travel
          through the public internet before entering the AWS global edge network. By exposing the platform through a public domain backed
          by globally distributed infrastructure, MUBox ensures that educational tools hosted on the platform remain accessible to users
          regardless of geographic location while still maintaining strong security controls at the edge.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="2. Domain Routing (Amazon Route 53)">
        <Markdown>
          The **mu-box.com** domain is managed using [Amazon Route 53](https://aws.amazon.com/route53/), which acts as the authoritative DNS
          provider for the platform. The Route 53 hosted zone contains an alias record pointing the domain to the MUBox CloudFront
          distribution. When a user accesses the platform, Route 53 resolves the domain name and routes the request into the AWS global edge
          network. This configuration allows MUBox to integrate DNS resolution directly with the platforms content distribution layer.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="3. Edge Firewall (AWS WAF)">
        <Markdown>
          Incoming requests are filtered by [AWS WAF](https://aws.amazon.com/waf/) before they reach the application layer. AWS WAF acts as
          the platforms global web firewall and helps protect MUBox against common web threats. Managed rule groups are used to detect and
          block malicious request patterns including common injection attacks, malicious input payloads, and traffic originating from known
          malicious IP ranges. Filtering traffic at the edge prevents potentially harmful requests from reaching backend services and
          significantly reduces the platforms attack surface.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="4. Authentication Interceptor (Lambda@Edge)">
        <Markdown>
          Authentication is enforced at the edge using [Lambda@Edge](https://aws.amazon.com/lambda/edge/). A viewer request interceptor
          executes before CloudFront forwards requests to application origins. This interceptor verifies that the user has a valid
          authenticated session issued by [Amazon Cognito](https://aws.amazon.com/cognito/). If the user is not authenticated, the
          interceptor redirects them to the Cognito authentication flow. Once authentication succeeds, the user receives a secure session
          cookie which is validated for all subsequent requests. Performing authentication at the edge ensures that unauthenticated requests
          are rejected before reaching backend infrastructure.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="5. Identity Management (Amazon Cognito)">
        <Markdown>
          User identity and authentication are handled by [Amazon Cognito](https://aws.amazon.com/cognito/). Cognito provides a managed
          identity service that supports secure login flows, token issuance, and session management. When a user attempts to access a
          protected resource, the Lambda@Edge interceptor redirects them to the Cognito login interface. After successful authentication,
          Cognito returns identity tokens that establish an authenticated session with the platform. These tokens are then validated at the
          edge to ensure that only authenticated users can access protected resources.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="6. CloudFront Distribution (Global Edge Network)">
        <Markdown>
          The MUBox platform is delivered through [Amazon CloudFront](https://aws.amazon.com/cloudfront/), which acts as the global content
          distribution network (CDN). CloudFront performs several critical roles within the architecture: - TLS termination for the
          **mu-box.com** domain - Global caching of static application assets - Routing requests to backend services - Executing edge
          functions for authentication Using CloudFront allows MUBox to deliver content with low latency to users worldwide while
          maintaining centralised control over routing and security policies.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="7. Backend API Layer (AWS Lambda)">
        <Markdown>
          Backend functionality for MUBox is implemented using [AWS Lambda](https://aws.amazon.com/lambda/), which provides serverless
          compute for API endpoints. API requests are routed through CloudFront using path-based routing patterns such as **/api/\*/**.
          These requests invoke Lambda functions that implement the platforms backend logic. The API layer is implemented in TypeScript and
          exposes strongly typed endpoints using [tRPC](https://trpc.io/). This allows the frontend and backend to share type definitions,
          enabling end-to-end type safety across the platform.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="8. Observability Pipeline (CloudWatch RUM)">
        <Markdown>
          MUBox collects client-side telemetry using [Amazon CloudWatch
          RUM](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html). Real User Monitoring captures
          performance and interaction data directly from user browsers. To simplify authentication for telemetry submissions, the platform
          exposes a dedicated **/rum** endpoint backed by a Lambda function. This function processes incoming telemetry events and forwards
          them to CloudWatch RUM while also emitting structured logs to CloudWatch Logs. This architecture allows platform maintainers to
          analyse performance metrics, diagnose issues, and better understand how users interact with the hosted tools.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="9. Static Asset Hosting (Amazon S3)">
        <Markdown>
          Static frontend assets such as HTML, JavaScript, and CSS are stored in an [Amazon S3](https://aws.amazon.com/s3/) bucket. The S3
          bucket is not publicly accessible. Instead, access is restricted using CloudFront Origin Access Control (OAC), which ensures that
          assets can only be retrieved through the CloudFront distribution. This design ensures that users cannot bypass platform security
          controls by directly accessing the storage bucket. All requests must pass through the CloudFront distribution, where
          authentication, caching, and security policies are enforced.
        </Markdown>
      </LinkableSection>
    </PageSectionContent>
    <PageSectionContent>
      <img alt="CI/CD" src={pipelineImage} className="my-8 w-auto" />
      <Markdown>
        Above diagram illustrates the MUBox CI/CD pipeline, showing how source code changes progress from development through automated
        validation and ultimately into production deployment.
      </Markdown>
      <LinkableSection title="10. Developer Workflow">
        <Markdown>
          Development begins when a contributor pushes changes to the MUBox repository or opens a pull request. Contributors typically work
          on feature branches which are reviewed through pull requests before being merged into the **main** branch. This workflow ensures
          that all changes are reviewed and validated before being integrated into the production codebase. Once code is merged into the
          main branch, the deployment pipeline is triggered automatically, initiating the continuous integration and deployment workflow.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="11. Continuous Integration (GitHub Actions)">
        <Markdown>
          Continuous integration is implemented using [GitHub Actions](https://docs.github.com/en/actions). When code is pushed or a pull
          request is opened, the CI workflow executes a series of automated checks including: - Code linting and formatting validation -
          Type checking - Unit test execution - Build verification These automated checks ensure that changes meet the platforms quality
          standards before they can progress further in the deployment pipeline.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="12. Pipeline Trigger (AWS Connector for GitHub)">
        <Markdown>
          When changes are merged into the **main** branch, the MUBox deployment pipeline is triggered through the [AWS Connector for
          GitHub](https://docs.aws.amazon.com/codepipeline/latest/userguide/connections-github.html). This integration allows AWS services
          to respond to repository events and automatically start the deployment process. By integrating directly with the source
          repository, MUBox ensures that deployments always reflect the latest validated version of the codebase.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="13. Shared Infrastructure Pipeline (AWS CodePipeline)">
        <Markdown>
          The deployment workflow is orchestrated using [AWS
          CodePipeline](https://docs.aws.amazon.com/codepipeline/latest/userguide/welcome.html), which runs inside a dedicated shared
          infrastructure account. CodePipeline coordinates the build and deployment stages of the system, ensuring that infrastructure
          updates and application changes are executed in a consistent and reproducible manner. Centralising the deployment pipeline in a
          shared account improves security by isolating deployment permissions from runtime application environments.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="14. Infrastructure Definition (AWS CDK)">
        <Markdown>
          MUBox infrastructure is defined using the [AWS Cloud Development Kit](https://docs.aws.amazon.com/cdk/v2/guide/home.html).
          Developers describe infrastructure using TypeScript constructs which represent cloud resources such as Lambda functions,
          CloudFront distributions, and storage services. During the deployment process, the CDK **synthesizes CloudFormation templates**
          which are then executed by the deployment pipeline. This model allows infrastructure to be developed using familiar programming
          languages while still leveraging the reliability and lifecycle management capabilities of AWS CloudFormation under the hood.
          Defining infrastructure in this way ensures that the entire platform remains version controlled, reproducible, and tightly
          integrated with the application codebase.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="15. Development Environment Deployment">
        <Markdown>
          The first deployment stage targets the **development environment**. Deploying changes into a development environment allows
          maintainers to verify that infrastructure updates and application changes behave correctly before promoting them to production.
          This environment acts as a staging ground where integration issues can be detected without impacting live users of the platform.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="16. Manual Approval Gate">
        <Markdown>
          After successful deployment to the development environment, the pipeline pauses at a **manual approval stage**. This stage
          requires a maintainer to review the deployment results before allowing the release to progress to production. The manual approval
          step acts as an additional safeguard that prevents accidental or unverified deployments from reaching the live platform.
        </Markdown>
      </LinkableSection>

      <LinkableSection title="17. Production Environment Deployment">
        <Markdown>
          Once approval is granted, the pipeline proceeds to deploy the updated infrastructure and application code to the **production
          environment**. CloudFormation updates the production stacks using the same templates used in development, ensuring that both
          environments remain consistent. After deployment completes, the new version of MUBox becomes available to users through the
          production infrastructure.
        </Markdown>
      </LinkableSection>
    </PageSectionContent>
  </>
);
