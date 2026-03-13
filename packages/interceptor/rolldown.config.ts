import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/index.ts", // This is the entry point of all of our logic
  platform: "node",
  output: {
    file: "../../build/interceptor-edge-lambda/index.mjs", // The file that will be emitted.
    format: "esm", // Ensures we target ESM formatted output
    minify: true, // Ensures minified code is generated to minimize cold starts.
  },
});
