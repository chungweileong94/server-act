import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
  },
  dts: true,
  format: ["esm", "cjs"],
});
