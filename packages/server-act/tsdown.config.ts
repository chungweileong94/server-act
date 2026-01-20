import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    middleware: "./src/middleware.ts",
    utils: "./src/utils.ts",
  },
  dts: true,
  format: ["esm", "cjs"],
});
