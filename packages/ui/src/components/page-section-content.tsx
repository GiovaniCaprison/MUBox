import type { FunctionComponent, ReactNode } from "react";

import { ErrorBoundary } from "./error-boundary";

interface Props {
  readonly children: ReactNode;
  readonly className?: string;
}

export const PageSectionContent: FunctionComponent<Props> = ({ children, className }) => (
  <ErrorBoundary>
    <div className={`mx-auto max-w-[1440px] overflow-x-auto px-8 ${className ?? ""}`}>{children}</div>
  </ErrorBoundary>
);
