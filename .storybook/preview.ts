import type { Preview } from "@storybook/react-vite";
import "../src/i18n";
import "../src/styles/tokens.css";
import "../src/styles/tailwind.css";
import "../src/styles/buttons.css";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      options: {
        app: { name: "App", value: "#12161f" },
        raised: { name: "Surface raised", value: "#232b3f" },
        light: { name: "Light", value: "#f8f9fa" },
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: "app" },
  },
};

export default preview;
