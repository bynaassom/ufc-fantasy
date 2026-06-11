import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Saira Condensed", "sans-serif"],
        condensed: ["Saira Condensed", "sans-serif"],
      },
      colors: {
        red: {
          500: "#E8001A",
          600: "#C8001A",
          700: "#A80014",
        },
        surface: {
          DEFAULT: "var(--bg)",
          secondary: "var(--bg-secondary)",
          card: "var(--bg-card)",
          elevated: "var(--bg-elevated)",
        },
        text: {
          DEFAULT: "var(--text)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        border: {
          DEFAULT: "var(--border)",
          light: "var(--border-light)",
        },
        brand: {
          red: "var(--red)",
          green: "var(--green)",
          blue: "var(--blue)",
          yellow: "var(--yellow)",
        },
      },
      letterSpacing: {
        widest: "0.2em",
        ultra: "0.3em",
      },
    },
  },
  plugins: [],
};

export default config;
