import { config } from "@chungwei/oxlint-config";
import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["**/drizzle/meta/**/*.json"],
    printWidth: 80,
    sortImports: {
      newlinesBetween: false,
    },
    experimentalTailwindcss: {},
  },
  lint: {
    extends: [config],
    options: {
      typeAware: true,
      typeCheck: true,
      reportUnusedDisableDirectives: "error",
    },
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
  },
});
