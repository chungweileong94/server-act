import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["**/drizzle/meta/**/*.json"],
    printWidth: 80,
    experimentalSortImports: {
      newlinesBetween: false,
    },
    experimentalTailwindcss: {},
  },
  lint: {
    plugins: ["eslint", "unicorn", "typescript", "oxc", "react"],
    options: {
      typeAware: true,
      typeCheck: true,
      reportUnusedDisableDirectives: "error",
    },
    categories: {
      correctness: "error",
      suspicious: "error",
    },
    rules: {
      "no-var": "error",
      "no-console": [
        "error",
        {
          allow: ["warn", "error", "info"],
        },
      ],
      "typescript/no-require-imports": "error",
      "typescript/no-explicit-any": "error",
      "typescript/ban-ts-comment": "error",
      "typescript/consistent-type-imports": "error",
      "typescript/no-unnecessary-type-constraint": "error",
      "typescript/no-non-null-assertion": "error",
      "typescript/no-unsafe-type-assertion": "off",
      "react/rules-of-hooks": "error",
      "react/self-closing-comp": "error",
      "react/react-in-jsx-scope": "off",
    },
  },
});
