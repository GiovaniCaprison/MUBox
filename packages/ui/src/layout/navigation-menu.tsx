import ButtonDropdown from "@cloudscape-design/components/button-dropdown";
import type { FunctionComponent } from "react";
import { useNavigate } from "react-router";

import { routeMetadata } from "@/routes";

export const NavigationMenu: FunctionComponent = () => {
  const navigate = useNavigate();

  return (
    <span className="mr-4 md:hidden">
      <ButtonDropdown
        items={routeMetadata.map(({ icon, path, title }) => ({
          iconName: icon,
          id: path,
          text: title,
        }))}
        ariaLabel="Navigation Menu"
        expandToViewport
        onItemClick={(event) => void navigate(event.detail.id)}
        variant="icon"
      />
    </span>
  );
};
