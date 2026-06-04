/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

const analyzePlugin: PluginOption | false =
  process.env.ANALYZE === "true" &&
  visualizer({
    filename: "bundle-stats.html",
    gzipSize: true,
    brotliSize: true,
    template: "treemap",
    open: false,
  });

export default defineConfig({
  plugins: [react(), ...(analyzePlugin ? [analyzePlugin] : [])],
  build: {
    outDir: "build",
  },
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 3000,
  },
  test: {
    globals: true,
    css: true,
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/setupTests.ts",
        "src/test/**",
        "src/index.tsx",
        "src/reportWebVitals.ts",
        "src/**/*.d.ts",
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.{test,spec}.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          setupFiles: ["./src/setupTests.ts"],
          include: ["src/**/*.{test,spec}.tsx"],
        },
      },
    ],
  },
});
