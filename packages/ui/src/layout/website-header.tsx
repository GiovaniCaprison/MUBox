import SpaceBetween from "@cloudscape-design/components/space-between";
import { type FunctionComponent, useEffect, useState } from "react";

import { NavigationMenu } from "./navigation-menu";
import { NavigationTabs } from "./navigation-tabs";
import { UserPreferences } from "./user-preferences";
import { WebsiteLogo } from "./website-logo";
import { ErrorBoundary } from "@/components/error-boundary";

const isScrolledDown = (): boolean => window.scrollY > 0;

const useScrollTrigger = (): boolean => {
  const [trigger, setTrigger] = useState<boolean>(isScrolledDown);

  // Sets up event listeners for handling scrolls
  useEffect(() => {
    const handleScroll = () => setTrigger(isScrolledDown());

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return trigger;
};

export const WebsiteHeader: FunctionComponent = () => {
  const trigger = useScrollTrigger();

  return (
    <header
      className={`bg-header-bg fixed top-0 z-1000 flex min-h-[62px] w-full items-center overflow-visible border-b-1 px-8 transition-[all_ease_0.3s] ${trigger ? "border-primary shadow-[0_4px_6px_rgba(0,0,0,0.24)]" : "border-transparent"}`}
    >
      <ErrorBoundary>
        <NavigationMenu />

        <WebsiteLogo />

        <NavigationTabs />

        <SpaceBetween alignItems="center" size="m" direction="horizontal">
          <UserPreferences />
        </SpaceBetween>
      </ErrorBoundary>
    </header>
  );
};
