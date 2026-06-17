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
          blue:   "#1E56C4",  // principal
          navy:   "#0D2240",  // textos fuertes / header
          gray:   "#5C6B7A",  // texto secundario
          teal:   "#12A594",  // P1 Quick Win
          indigo: "#4F46E5",  // P2 Gran Proyecto + admin
          amber:  "#D97706",  // P0 Descartada
          accent: "#2D6DF6",  // hover CTA
          gold:   "#F4C026",  // acento terciario
        },
      },
    },
  },
  plugins: [],
};

export default config;
