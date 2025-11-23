import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        groth16: "#ffffff",
        plonk: "#ffffff",
        stark: "#ffffff",
        arbitrum: {
          blue: "#ffffff",
          dark: "#000000",
        },
      },
    },
  },
  plugins: [],
};

export default config;
