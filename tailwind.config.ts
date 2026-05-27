import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          orange: "#E8621A",
          black: "#111111",
          gray: "#6B6B6B",
          green: "#1D9E75",
          blue: "#1E6FC5",
        },
      },
    },
  },
  plugins: [],
};

export default config;
