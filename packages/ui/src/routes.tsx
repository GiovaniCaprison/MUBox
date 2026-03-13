import type { IndexRouteObject, NonIndexRouteObject } from "react-router";

import { ArchitecturePage } from "@/pages/architecture/architecture-page";
import { FAQPage } from "@/pages/faq/faq-page";
import { HomePage } from "@/pages/home/home-page";
import { QuickStartPage } from "@/pages/quick-start/quick-start-page";
import { TSFlapPage } from "@/pages/tsflap/tsflap-page";
import { TSFlapSimulatorPage } from "@/pages/tsflap/tsflap-simulator-page";
import type { RouteMetadata } from "@/types/route";

export const ROUTE_PATHS = {
  HOME: "/",
  ARCHITECTURE: "/architecture",
  FAQ: "/faq",
  QUICK_START: "/quick-start",
  TSFLAP: "/tsflap",
  TSFLAP_SIMULATOR: "/tsflap/simulator",
} as const;

export const QUICK_START_ROUTE: RouteMetadata = {
  title: "Quick Start",
  description: "A quick overview to make your way around MUBox",
  icon: "contact",
  path: ROUTE_PATHS.QUICK_START,
};

export const ARCHITECTURE_ROUTE: RouteMetadata = {
  title: "Architecture",
  description: "An overview of the architecture that powers MUBox",
  icon: "script",
  path: ROUTE_PATHS.ARCHITECTURE,
};

export const FAQ_ROUTE: RouteMetadata = {
  title: "FAQ",
  description: "A list of frequently asked questions regarding MUBox",
  icon: "support",
  path: ROUTE_PATHS.FAQ,
};

export const TSFLAP_ROUTE: RouteMetadata = {
  title: "TSFlap",
  description: "Interactive finite automata visualization and design tool",
  icon: "edit",
  path: ROUTE_PATHS.TSFLAP,
};

export const TSFLAP_SIMULATOR_ROUTE: RouteMetadata = {
  title: "Simulator",
  description: "Interactive automata simulator canvas",
  icon: "edit",
  path: ROUTE_PATHS.TSFLAP_SIMULATOR,
};

export const routeMetadata: RouteMetadata[] = [QUICK_START_ROUTE, ARCHITECTURE_ROUTE, FAQ_ROUTE, TSFLAP_ROUTE];

export const routes: (IndexRouteObject | NonIndexRouteObject)[] = [
  { index: true, element: <HomePage /> },
  { path: ROUTE_PATHS.ARCHITECTURE, element: <ArchitecturePage /> },
  { path: ROUTE_PATHS.FAQ, element: <FAQPage /> },
  { path: ROUTE_PATHS.QUICK_START, element: <QuickStartPage /> },
  { path: ROUTE_PATHS.TSFLAP, element: <TSFlapPage /> },
  { path: ROUTE_PATHS.TSFLAP_SIMULATOR, element: <TSFlapSimulatorPage /> },
];
