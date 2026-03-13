import Box from "@cloudscape-design/components/box";
import Icon from "@cloudscape-design/components/icon";
import { type FunctionComponent, type ReactNode, useState } from "react";
import { Link } from "react-router";

interface Props {
  readonly children?: ReactNode;
  readonly title: string;
  readonly className?: string;
}

export const LinkableSection: FunctionComponent<Props> = ({ children, className, title }) => {
  const [isHoveredOver, setHover] = useState(false);

  const id = title.toLowerCase().split(" ").join("_");

  const scrollToAnchor = (anchorElement: Element): void => {
    anchorElement.scrollIntoView();
  };

  return (
    <div className={`my-8 ${className ?? ""}`}>
      <Link
        id={id}
        to={{ hash: `#${id}` }}
        onClick={(event) => scrollToAnchor(event.currentTarget)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="mb-3 flex cursor-pointer items-center align-middle no-underline"
        title="Click to copy link to this section"
      >
        <Box variant="h2" fontSize="heading-l" margin={{ right: "s" }}>
          {title}
        </Box>

        {isHoveredOver && <Icon ariaLabel="Copy Icon" name="copy" />}
      </Link>

      {children}
    </div>
  );
};
