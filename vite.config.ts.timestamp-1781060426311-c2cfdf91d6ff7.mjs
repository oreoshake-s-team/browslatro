import "node:module";
import { defineConfig } from "file:///Users/oreoshake/.cache/browslatro-worktrees/895-full-house-contains-two-pair/.yarn/__virtual__/vite-virtual-6eff3b6159/4/.yarn/berry/cache/vite-npm-8.0.14-8db061e6c9-10c0.zip/node_modules/vite/dist/node/index.js";
import react from "file:///Users/oreoshake/.cache/browslatro-worktrees/895-full-house-contains-two-pair/.yarn/__virtual__/@vitejs-plugin-react-virtual-d1bac454f7/4/.yarn/berry/cache/@vitejs-plugin-react-npm-6.0.2-0f2620b1d7-10c0.zip/node_modules/@vitejs/plugin-react/dist/index.js";
import { visualizer } from "file:///Users/oreoshake/.cache/browslatro-worktrees/895-full-house-contains-two-pair/.yarn/__virtual__/rollup-plugin-visualizer-virtual-61357433f9/4/.yarn/berry/cache/rollup-plugin-visualizer-npm-7.0.1-a445923abe-10c0.zip/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import.meta.url;
const analyzePlugin = process.env.ANALYZE === "true" && visualizer({
	filename: "bundle-stats.html",
	gzipSize: true,
	brotliSize: true,
	template: "treemap",
	open: false
});
var vite_config_default = defineConfig({
	define: { "import.meta.env.VITE_ON_VERCEL": JSON.stringify(process.env.VERCEL ?? "0") },
	plugins: [react(), ...analyzePlugin ? [analyzePlugin] : []],
	build: { outDir: "build" },
	server: {
		port: 3e3,
		open: true
	},
	preview: { port: 3e3 },
	test: {
		globals: true,
		css: true,
		coverage: {
			provider: "istanbul",
			reporter: [
				"text",
				"html",
				"lcov"
			],
			reportsDirectory: "./coverage",
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"src/**/*.{test,spec}.{ts,tsx}",
				"src/setupTests.ts",
				"src/test/**",
				"src/index.tsx",
				"src/reportWebVitals.ts",
				"src/**/*.d.ts"
			]
		},
		projects: [{
			extends: true,
			test: {
				name: "node",
				environment: "node",
				include: ["src/**/*.{test,spec}.ts"]
			}
		}, {
			extends: true,
			test: {
				name: "jsdom",
				environment: "jsdom",
				setupFiles: ["./src/setupTests.ts"],
				include: ["src/**/*.{test,spec}.tsx"]
			}
		}]
	}
});
//#endregion
export { vite_config_default as default };

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidml0ZS5jb25maWcuanMiLCJuYW1lcyI6W10sInNvdXJjZXMiOlsiL1VzZXJzL29yZW9zaGFrZS8uY2FjaGUvYnJvd3NsYXRyby13b3JrdHJlZXMvODk1LWZ1bGwtaG91c2UtY29udGFpbnMtdHdvLXBhaXIvdml0ZS5jb25maWcudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlc3QvY29uZmlnXCIgLz5cbmltcG9ydCB7IGRlZmluZUNvbmZpZywgdHlwZSBQbHVnaW5PcHRpb24gfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IHsgdmlzdWFsaXplciB9IGZyb20gXCJyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXJcIjtcblxuY29uc3QgYW5hbHl6ZVBsdWdpbjogUGx1Z2luT3B0aW9uIHwgZmFsc2UgPVxuICBwcm9jZXNzLmVudi5BTkFMWVpFID09PSBcInRydWVcIiAmJlxuICB2aXN1YWxpemVyKHtcbiAgICBmaWxlbmFtZTogXCJidW5kbGUtc3RhdHMuaHRtbFwiLFxuICAgIGd6aXBTaXplOiB0cnVlLFxuICAgIGJyb3RsaVNpemU6IHRydWUsXG4gICAgdGVtcGxhdGU6IFwidHJlZW1hcFwiLFxuICAgIG9wZW46IGZhbHNlLFxuICB9KTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgZGVmaW5lOiB7XG4gICAgXCJpbXBvcnQubWV0YS5lbnYuVklURV9PTl9WRVJDRUxcIjogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuVkVSQ0VMID8/IFwiMFwiKSxcbiAgfSxcbiAgcGx1Z2luczogW3JlYWN0KCksIC4uLihhbmFseXplUGx1Z2luID8gW2FuYWx5emVQbHVnaW5dIDogW10pXSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6IFwiYnVpbGRcIixcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBvcGVuOiB0cnVlLFxuICB9LFxuICBwcmV2aWV3OiB7XG4gICAgcG9ydDogMzAwMCxcbiAgfSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgY3NzOiB0cnVlLFxuICAgIGNvdmVyYWdlOiB7XG4gICAgICBwcm92aWRlcjogXCJpc3RhbmJ1bFwiLFxuICAgICAgcmVwb3J0ZXI6IFtcInRleHRcIiwgXCJodG1sXCIsIFwibGNvdlwiXSxcbiAgICAgIHJlcG9ydHNEaXJlY3Rvcnk6IFwiLi9jb3ZlcmFnZVwiLFxuICAgICAgaW5jbHVkZTogW1wic3JjLyoqLyoue3RzLHRzeH1cIl0sXG4gICAgICBleGNsdWRlOiBbXG4gICAgICAgIFwic3JjLyoqLyoue3Rlc3Qsc3BlY30ue3RzLHRzeH1cIixcbiAgICAgICAgXCJzcmMvc2V0dXBUZXN0cy50c1wiLFxuICAgICAgICBcInNyYy90ZXN0LyoqXCIsXG4gICAgICAgIFwic3JjL2luZGV4LnRzeFwiLFxuICAgICAgICBcInNyYy9yZXBvcnRXZWJWaXRhbHMudHNcIixcbiAgICAgICAgXCJzcmMvKiovKi5kLnRzXCIsXG4gICAgICBdLFxuICAgIH0sXG4gICAgcHJvamVjdHM6IFtcbiAgICAgIHtcbiAgICAgICAgZXh0ZW5kczogdHJ1ZSxcbiAgICAgICAgdGVzdDoge1xuICAgICAgICAgIG5hbWU6IFwibm9kZVwiLFxuICAgICAgICAgIGVudmlyb25tZW50OiBcIm5vZGVcIixcbiAgICAgICAgICBpbmNsdWRlOiBbXCJzcmMvKiovKi57dGVzdCxzcGVjfS50c1wiXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGV4dGVuZHM6IHRydWUsXG4gICAgICAgIHRlc3Q6IHtcbiAgICAgICAgICBuYW1lOiBcImpzZG9tXCIsXG4gICAgICAgICAgZW52aXJvbm1lbnQ6IFwianNkb21cIixcbiAgICAgICAgICBzZXR1cEZpbGVzOiBbXCIuL3NyYy9zZXR1cFRlc3RzLnRzXCJdLFxuICAgICAgICAgIGluY2x1ZGU6IFtcInNyYy8qKi8qLnt0ZXN0LHNwZWN9LnRzeFwiXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbn0pO1xuIl0sIm1hcHBpbmdzIjoiOzs7OztBQUtBLE1BQU0sZ0JBQ0osUUFBUSxJQUFJLFlBQVksVUFDeEIsV0FBVztDQUNULFVBQVU7Q0FDVixVQUFVO0NBQ1YsWUFBWTtDQUNaLFVBQVU7Q0FDVixNQUFNO0FBQ1IsQ0FBQztBQUVILElBQUEsc0JBQWUsYUFBYTtDQUMxQixRQUFRLEVBQ04sa0NBQWtDLEtBQUssVUFBVSxRQUFRLElBQUksVUFBVSxHQUFHLEVBQzVFO0NBQ0EsU0FBUyxDQUFDLE1BQU0sR0FBRyxHQUFJLGdCQUFnQixDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUU7Q0FDNUQsT0FBTyxFQUNMLFFBQVEsUUFDVjtDQUNBLFFBQVE7RUFDTixNQUFNO0VBQ04sTUFBTTtDQUNSO0NBQ0EsU0FBUyxFQUNQLE1BQU0sSUFDUjtDQUNBLE1BQU07RUFDSixTQUFTO0VBQ1QsS0FBSztFQUNMLFVBQVU7R0FDUixVQUFVO0dBQ1YsVUFBVTtJQUFDO0lBQVE7SUFBUTtHQUFNO0dBQ2pDLGtCQUFrQjtHQUNsQixTQUFTLENBQUMsbUJBQW1CO0dBQzdCLFNBQVM7SUFDUDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7R0FDRjtFQUNGO0VBQ0EsVUFBVSxDQUNSO0dBQ0UsU0FBUztHQUNULE1BQU07SUFDSixNQUFNO0lBQ04sYUFBYTtJQUNiLFNBQVMsQ0FBQyx5QkFBeUI7R0FDckM7RUFDRixHQUNBO0dBQ0UsU0FBUztHQUNULE1BQU07SUFDSixNQUFNO0lBQ04sYUFBYTtJQUNiLFlBQVksQ0FBQyxxQkFBcUI7SUFDbEMsU0FBUyxDQUFDLDBCQUEwQjtHQUN0QztFQUNGLENBQ0Y7Q0FDRjtBQUNGLENBQUMifQ==