/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

const analyzePlugin: PluginOption | false =
  process.env.ANALYZE === "true" &&
  visualizer({
    filename: "bundle-stats.html",
    gzipSize: true,
    brotliSize: true,
    template: "treemap",
    open: false,
  });

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const siteUrlPlugin: PluginOption = {
  name: "browslatro:site-url",
  transformIndexHtml(html) {
    return html.replaceAll("%SITE_URL%", siteUrl);
  },
};

const pwaPlugin: PluginOption[] = process.env.VITEST
  ? []
  : VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,mp3,json}"],
      },
    });

export default defineConfig({
  define: {
    "import.meta.env.VITE_ON_VERCEL": JSON.stringify(process.env.VERCEL ?? "0"),
  },
  plugins: [
    react(),
    siteUrlPlugin,
    ...pwaPlugin,
    ...(analyzePlugin ? [analyzePlugin] : []),
  ],
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
