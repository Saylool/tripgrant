import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve("app"),
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom"] },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules\/(react|react-dom|scheduler)\//,
              priority: 20,
            },
            {
              name: "solana",
              test: /node_modules\/(@solana|@noble|bn.js|bs58|buffer)/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  server: { host: "127.0.0.1", fs: { allow: [path.resolve(".")] } },
  define: { "process.env": "{}", global: "globalThis" },
});
