import React, { createContext, useContext, useMemo } from "react";

import { modernTheme } from "../themes/modern";
import type { ThemeConfig } from "../themes/types";

const ThemeContext = createContext<ThemeConfig>(modernTheme);

export function useTheme(): ThemeConfig {
  return useContext(ThemeContext);
}

export interface ThemeProviderProps {
  /** Base theme to use. Defaults to modernTheme. */
  theme?: ThemeConfig;
  /** Partial overrides to merge on top of the base theme. Useful for dark mode or custom styling. */
  overrides?: Partial<ThemeConfig>;
  children: React.ReactNode;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function ThemeProvider({ theme = modernTheme, overrides, children }: ThemeProviderProps) {
  const mergedTheme = useMemo<ThemeConfig>(() => (overrides ? { ...theme, ...overrides } : theme), [theme, overrides]);

  return <ThemeContext.Provider value={mergedTheme}>{children}</ThemeContext.Provider>;
}
