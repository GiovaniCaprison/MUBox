import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/index.ts", // This is the entry point of all of our logic
  platform: "node",
  output: {
    file: "../../build/rum-lambda/index.mjs", // The file that will be emitted.
    format: "esm", // Ensures we target ESM formatted output
    inlineDynamicImports: true, // Ensures dynamic imports are eagerly evaluated and then inlined
    minify: true, // Ensures minified code is generated to minimize cold starts.
    sourcemap: true, // Enables sourcemap generation which improves debugging of minified/mangled code
  },
});
