/**
 * Providers - Public API
 * Barrel export for React context providers and their hooks
 *
 * Note: Barrel exports for React components should be used sparingly
 * as they can interfere with hot module reloading (HMR) and tree-shaking.
 * For providers, we make an exception since they're typically used at the app root.
 */

export { TrpcProvider } from "./trpc-provider";
export { RegionProvider, RegionContext } from "./region-provider";
export { ThemeProvider, DarkModeContext } from "./theme-provider";
