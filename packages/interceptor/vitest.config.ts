import { defineConfig, mergeConfig } from "vitest/config";

import { getBaseConfig } from "../../vitest.config";

export default mergeConfig(
  getBaseConfig(import.meta.dirname),
  defineConfig({
    test: {
      coverage: {
        thresholds: {
          branches: 0,
          functions: 0,
          lines: 0,
          statements: 0,
        },
      },
    },
  }),
);
