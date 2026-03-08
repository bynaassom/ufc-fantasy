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
        sans: ["Encode Sans", "sans-serif"],
        condensed: ["Barlow Condensed", "sans-serif"],
      },
      colors: {
        red: {
          500: "#E8001A",
          600: "#C8001A",
          700: "#A80014",
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
