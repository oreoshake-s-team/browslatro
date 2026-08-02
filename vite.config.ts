/// <reference types="vitest/config" />
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { defineConfig, type PluginOption } from "vite";
import tailwindcss from "@tailwindcss/vite";
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

// react-dom/profiling internally does require("react-dom") to grab the
// shared internals object (ReactDOMSharedInternals) that the base react-dom
// package owns. A blanket resolve.alias rewrites that internal require too,
// turning it into a circular self-import (see #1832). This plugin redirects
// react-dom/react-dom/client to react-dom/profiling for every importer
// except react-dom's own files, so app code (including createPortal, used
// throughout src/components/**) consistently shares the same
// profiling-enabled module as createRoot.
const profilingReactDomAliasPlugin = (): PluginOption => {
  let reactDomDir: string | undefined;
  return {
    name: "browslatro:profiling-react-dom-alias",
    enforce: "pre",
    async resolveId(source, importer) {
      if (source !== "react-dom" && source !== "react-dom/client") return null;
      if (reactDomDir === undefined) {
        const pkgJson = await this.resolve("react-dom/package.json", importer, {
          skipSelf: true,
        });
        reactDomDir = pkgJson ? dirname(pkgJson.id) : "";
      }
      if (importer && reactDomDir && importer.startsWith(reactDomDir)) return null;
      return this.resolve("react-dom/profiling", importer, { skipSelf: true });
    },
  };
};

export default defineConfig({
  define: {
    "import.meta.env.VITE_ON_VERCEL": JSON.stringify(process.env.VERCEL ?? "0"),
  },
  plugins: [
    tailwindcss(),
    react(),
    siteUrlPlugin,
    ...(analyzePlugin ? [analyzePlugin] : []),
    ...(isProfilingBuild ? [profilingReactDomAliasPlugin()] : []),
  ],
  build: {
    outDir: "build",
    // Minification mangles component names, making React DevTools Profiler
    // exports unreadable (fiber names collapse to 1-3 letter identifiers).
    minify: isProfilingBuild ? false : true,
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
