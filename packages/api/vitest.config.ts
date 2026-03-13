import { defineConfig, mergeConfig } from "vitest/config";

import { getBaseConfig } from "../../vitest.config";

export default mergeConfig(
  getBaseConfig(import.meta.dirname),
  defineConfig({
    test: {
      coverage: {
        // TODO - Remove once we have better coverage
        thresholds: {
          branches: 25,
          functions: 25,
          lines: 25,
          statements: 25,
        },
      },
    },
  }),
);
