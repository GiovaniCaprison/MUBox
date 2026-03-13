import CloudScapeLink, { type LinkProps } from "@cloudscape-design/components/link";
import type { FunctionComponent } from "react";
import { useNavigate } from "react-router";

interface Props extends Omit<LinkProps, "onFollow"> {
  readonly href: string;
}

export const Link: FunctionComponent<Props> = (props) => {
  const navigate = useNavigate();

  return (
    <CloudScapeLink
      {...props}
      onFollow={(event) => {
        event.preventDefault();
        void navigate(props.href);
      }}
    />
  );
};
