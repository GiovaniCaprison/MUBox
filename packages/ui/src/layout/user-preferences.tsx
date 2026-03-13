import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Icon from "@cloudscape-design/components/icon";
import Popover from "@cloudscape-design/components/popover";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { type FunctionComponent } from "react";

import { DarkModeToggle } from "./dark-mode-toggle";
import { RegionSelector } from "./region-selector";
import { ViewerAvatar } from "./viewer-avatar";
import { ErrorBoundary } from "@/components/error-boundary";

export const UserPreferences: FunctionComponent = () => (
  <Popover
    dismissButton={false}
    position="bottom"
    size="large"
    triggerType="custom"
    content={
      <ErrorBoundary>
        <SpaceBetween size="m">
          <FormField label="Visual Mode:" description="This controls the visual display throughout the website">
            <DarkModeToggle />
          </FormField>

          <FormField label="Connected To:" description="This is the region requests will be routed to">
            <RegionSelector />
          </FormField>
        </SpaceBetween>
      </ErrorBoundary>
    }
  >
    <Button variant="link">
      <span className="flex items-center gap-2">
        <ViewerAvatar />
        <Icon name="caret-down-filled" variant="subtle" />
      </span>
    </Button>
  </Popover>
);
