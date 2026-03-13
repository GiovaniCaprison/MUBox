import TextContent from "@cloudscape-design/components/text-content";
import ReactMarkdown, { type MarkdownToJSX } from "markdown-to-jsx";
import type { FunctionComponent } from "react";

interface Props {
  readonly children: string;
  readonly className?: string;
}

const StyledLink: FunctionComponent<React.ComponentProps<"a">> = ({ children, ...props }) => (
  <a
    {...props}
    style={{
      color: "#0972d3",
      textDecoration: "none",
      fontSize: "inherit",
      fontFamily: "inherit",
      cursor: "pointer",
    }}
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
);

const options: MarkdownToJSX.Options = {
  overrides: {
    a: { component: StyledLink },
  },
};

export const Markdown: FunctionComponent<Props> = ({ children, className }) => (
  <TextContent>
    <ReactMarkdown className={className} options={options}>
      {children}
    </ReactMarkdown>
  </TextContent>
);
