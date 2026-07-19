import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    clearMocks: true,
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    exclude: ["node_modules", ".next", "e2e/**", "dist"],
    coverage: {
      provider: "v8",
      include: ["app/actions/**/*.ts", "lib/**/*.ts", "lib/**/*.tsx", "hooks/**/*.ts"],
      exclude: ["lib/generated/**", "lib/prisma.ts", "**/*.d.ts"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
