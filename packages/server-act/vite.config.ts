import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: {
      index: "./src/index.ts",
      utils: "./src/utils.ts",
    },
    dts: true,
    format: ["esm", "cjs"],
  },
});
