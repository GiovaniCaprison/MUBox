import CodeView from "@cloudscape-design/code-view/code-view";
import jsonHighlight from "@cloudscape-design/code-view/highlight/json";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Header from "@cloudscape-design/components/header";
import Icon from "@cloudscape-design/components/icon";
import type { FunctionComponent, ReactNode } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";

import { PageSectionBackground } from "@/components/page-section-background";
import { PageSectionContent } from "@/components/page-section-content";
import { Layout } from "@/layout/layout";

const DisplayErrorString: FunctionComponent<{ error: unknown }> = ({ error }) => (
  <>
    An unexpected error occurred:
    <br />
    <CodeView content={JSON.stringify(error, Object.getOwnPropertyNames(error), 4)} highlight={jsonHighlight} />
  </>
);

const getErrorDisplayContent = (error: unknown): ReactNode => {
  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 404:
        return "It appears you are lost. The path you entered does not match any expected paths.";
      case 401:
        return "You are not authorized to perform that operation.";
      default:
        return <DisplayErrorString error={error.data as unknown} />;
    }
  }

  return <DisplayErrorString error={error} />;
};

const getErrorPageSubtitle = (error: unknown): string =>
  isRouteErrorResponse(error) ? `${error.status}: ${error.statusText}` : "Unexpected Error";

export const ErrorPage: FunctionComponent = () => {
  const error = useRouteError();

  return (
    <Layout>
      <PageSectionBackground color="header">
        <PageSectionContent className="mt-[80px] flex items-center gap-2 pt-4 pb-8">
          <Icon ariaLabel="Error Icon" name="status-negative" size="large" />

          <Header description={getErrorPageSubtitle(error)} variant="h1">
            Error
          </Header>
        </PageSectionContent>
      </PageSectionBackground>

      <div className="m-auto">
        <Alert type="error">
          <Box variant="h2">{getErrorDisplayContent(error)}</Box>
        </Alert>
      </div>
    </Layout>
  );
};
