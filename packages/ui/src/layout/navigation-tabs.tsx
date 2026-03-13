import type { FunctionComponent } from "react";
import { Link, matchPath, useLocation } from "react-router";

import { ROUTE_PATHS, routeMetadata } from "@/routes";

/**
 * Maps parent route paths to their sub-route breadcrumb definitions.
 * When the current path matches a sub-route, the tab renders as a breadcrumb:
 * "Parent > Child" where Parent links back to the parent route.
 */
const SUB_ROUTE_BREADCRUMBS: Record<string, { path: string; label: string }[]> = {
  [ROUTE_PATHS.TSFLAP]: [{ path: ROUTE_PATHS.TSFLAP_SIMULATOR, label: "Simulator" }],
};

export const NavigationTabs: FunctionComponent = () => {
  const location = useLocation();

  const isActiveRoute = (path: string): boolean => {
    return !!matchPath(path, location.pathname) || location.pathname.startsWith(path + "/");
  };

  const getActiveSubRoute = (parentPath: string): { path: string; label: string } | undefined => {
    const subRoutes = SUB_ROUTE_BREADCRUMBS[parentPath];
    // This is very much a necessary condition
    // Whatever the linter is smoking is very good because wow
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!subRoutes) return undefined;
    return subRoutes.find((sub) => matchPath(sub.path, location.pathname));
  };

  return (
    <div className="ml-4 hidden grow-1 md:flex">
      {routeMetadata.map(({ path, title }, index) => {
        const activeSubRoute = getActiveSubRoute(path);
        const isActive = isActiveRoute(path);

        return (
          <div className={`border-primary flex items-center px-6 py-2 text-lg font-medium ${isActive ? "border-b-3" : ""}`} key={index}>
            <Link to={path} className={activeSubRoute ? "opacity-70 hover:opacity-100" : ""}>
              {title}
            </Link>
            {activeSubRoute && (
              <>
                <span className="mx-2 text-gray-400">/</span>
                <Link to={activeSubRoute.path} className="font-semibold">
                  {activeSubRoute.label}
                </Link>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
