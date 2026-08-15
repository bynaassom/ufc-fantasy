import type { Preview } from "@storybook/react-vite";
import MotionProvider from "../src/components/ui/MotionProvider";
import "../src/app/globals.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Tema visual",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "dark", title: "Escuro" },
          { value: "light", title: "Claro" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "dark",
  },
  decorators: [
    (Story, context) => (
      <MotionProvider>
        <div
          className={context.globals.theme === "light" ? "light" : "dark"}
          style={{
            minHeight: "100vh",
            backgroundColor: "var(--bg)",
            color: "var(--text)",
          }}
        >
          <Story />
        </div>
      </MotionProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "error",
    },
  },
};

export default preview;
