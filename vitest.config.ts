import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/amounts.test.ts", "tests/api.test.ts", "tests/bigint.test.ts"],
    environment: "node",
  },
});
