/* eslint-disable import/no-unassigned-import */
import { QueryClientProvider } from "@tanstack/react-query";
import { type FunctionComponent, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router";

import { routes } from "./routes";
import { queryClient } from "@/clients/query-client";
import { setupRum } from "@/clients/rum-client";
import { Layout } from "@/layout/layout";
import { ErrorPage } from "@/pages/error-page";
import { RegionProvider } from "@/providers/region-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { TrpcProvider } from "@/providers/trpc-provider";

// Applies CloudScape's CSS styling
import "@cloudscape-design/global-styles/index.css";

// Import to apply our CSS
import "./root.css";

// Sets up our RUM client only when running in production
if (import.meta.env.PROD) {
  void setupRum();
}

const router = createBrowserRouter([{ path: "/", element: <Layout />, children: routes, errorElement: <ErrorPage /> }]);

const Root: FunctionComponent = () => (
  <StrictMode>
    <RegionProvider>
      <QueryClientProvider client={queryClient}>
        <TrpcProvider>
          <ThemeProvider>
            <RouterProvider router={router} />
          </ThemeProvider>
        </TrpcProvider>
      </QueryClientProvider>
    </RegionProvider>
  </StrictMode>
);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- This will always be present given its set in public/index.html
const container: HTMLElement = document.getElementById("app")!;

// Renders the application
createRoot(container).render(<Root />);
