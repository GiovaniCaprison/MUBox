import { defineConfig } from "tsdown/config";

export default defineConfig({
  exports: true, // Enables controlling and generating the exports in the package.json
  dts: true, // Enables emission of TypeScript types
  format: "esm", // Ensures format is in ESM
});
