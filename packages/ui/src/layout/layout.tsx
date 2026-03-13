import type { FunctionComponent, ReactNode } from "react";
import { Outlet, useLocation } from "react-router";

import { Footer } from "./footer";
import { WebsiteHeader } from "./website-header";
import { ErrorBoundary } from "@/components/error-boundary";
import { ROUTE_PATHS } from "@/routes";

/** Routes that use a full-screen layout without the footer */
const FULL_SCREEN_ROUTES: string[] = [ROUTE_PATHS.TSFLAP_SIMULATOR];

interface Props {
  readonly children?: ReactNode;
}

export const Layout: FunctionComponent<Props> = ({ children }) => {
  const location = useLocation();
  const isFullScreen = FULL_SCREEN_ROUTES.includes(location.pathname);

  return (
    <>
      <ErrorBoundary>
        <WebsiteHeader />
      </ErrorBoundary>

      {children ?? <Outlet />}

      {!isFullScreen && (
        <ErrorBoundary>
          <Footer />
        </ErrorBoundary>
      )}
    </>
  );
};
