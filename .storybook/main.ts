import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";

const require = createRequire(import.meta.url);
const resolveAddon = (name: string): string =>
  dirname(require.resolve(`${name}/package.json`));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: [resolveAddon("@storybook/addon-a11y")],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  typescript: {
    reactDocgen: false,
  },
};

export default config;
