import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    utils: "./src/utils.ts",
  },
  dts: true,
  format: ["esm", "cjs"],
});
