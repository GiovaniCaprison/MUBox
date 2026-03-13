import { defineConfig, mergeConfig } from "vitest/config";

import { getBaseConfig } from "../../vitest.config";

export default mergeConfig(
  getBaseConfig(import.meta.dirname),
  defineConfig({
    test: {
      coverage: {
        thresholds: {
          branches: 90,
        },
      },
      setupFiles: ["test/setup.ts"],
    },
  }),
);
