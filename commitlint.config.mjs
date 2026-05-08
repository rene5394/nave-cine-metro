const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "chore", "docs", "style", "refactor", "test", "ci", "build", "perf"],
    ],
    "subject-case": [2, "always", "lower-case"],
    "header-max-length": [2, "always", 72],
  },
};

export default config;
