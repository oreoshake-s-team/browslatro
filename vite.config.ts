/// <reference types="vitest/config" />
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { applySiteUrl } from "./src/seo/siteUrl";

const analyzePlugin: PluginOption | false =
  process.env.ANALYZE === "true" &&
  visualizer({
    filename: "bundle-stats.html",
    gzipSize: true,
    brotliSize: true,
    template: "treemap",
    open: false,
  });

const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const SITE_URL_PUBLIC_FILES = ["robots.txt", "sitemap.xml"];

const siteUrlPlugin: PluginOption = {
  name: "browslatro:site-url",
  transformIndexHtml(html) {
    return applySiteUrl(html, siteUrl);
  },
  closeBundle() {
    for (const file of SITE_URL_PUBLIC_FILES) {
      const target = join("build", file);
      if (!existsSync(target)) continue;
      writeFileSync(target, applySiteUrl(readFileSync(target, "utf8"), siteUrl));
    }
  },
};

const isProfilingBuild = process.env.PROFILE === "true";

export default defineConfig({
  define: {
    "import.meta.env.VITE_ON_VERCEL": JSON.stringify(process.env.VERCEL ?? "0"),
  },
  resolve: {
    alias: isProfilingBuild
      ? [
          { find: "react-dom/client", replacement: "react-dom/profiling" },
          { find: "react-dom", replacement: "react-dom/profiling" },
        ]
      : [],
  },
  plugins: [
    react(),
    siteUrlPlugin,
    ...(analyzePlugin ? [analyzePlugin] : []),
  ],
  build: {
    outDir: "build",
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            {
              name: "vendor",
              test: /node_modules[\\/].*(react|scheduler|i18next|zustand|drag-drop-touch)/,
            },
          ],
        },
      },
    },
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
    testTimeout: process.env.CI ? 5_000 : 20_000,
    hookTimeout: process.env.CI ? 10_000 : 20_000,
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/*.stories.tsx",
        "src/stories/**",
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
          setupFiles: ["./src/test/memoryLocalStorage.ts"],
          include: ["src/**/*.{test,spec}.ts", "scripts/**/*.{test,spec}.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          setupFiles: ["./src/test/memoryLocalStorage.ts", "./src/setupTests.ts"],
          include: ["src/**/*.{test,spec}.tsx"],
        },
      },
    ],
  },
});
