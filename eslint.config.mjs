import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "prisma/migrations/**",
      "next-env.d.ts",
      // Vendored shadcn/ui boilerplate — kept close to upstream.
      "components/ui/**",
      "hooks/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    },
  },
];

export default config;
