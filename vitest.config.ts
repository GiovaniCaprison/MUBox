import { basename } from "node:path";
import { defineConfig } from "vitest/config";

export const getBaseConfig = (dirName: string) =>
  defineConfig({
    test: {
      coverage: {
        reportsDirectory: `../../build/documentation/coverage/packages/${basename(dirName)}`,
        reporter: ["cobertura", "html", "text"],
        enabled: true,
        include: ["src/**"],
        exclude: ["src/types/**"],
        thresholds: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
      silent: "passed-only",
    },
  });

/**
 * This is not used in builds, but it can be used during development for the Vitest development mode and UI.
 */
export default defineConfig({
  test: {
    workspace: ['packages/*'],
    silent: "passed-only",
  },
})
