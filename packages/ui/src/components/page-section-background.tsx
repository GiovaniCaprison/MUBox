import type { FunctionComponent, ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
  readonly className?: string;
  readonly color?: "header" | "section";
}

export const PageSectionBackground: FunctionComponent<Props> = ({ children, className, color }) => (
  <div
    className={`animate-bg-transition border-primary border-b-1 ${color === "header" ? "bg-header-bg" : "bg-section-bg"} ${className ?? ""}`}
  >
    {children}
  </div>
);
