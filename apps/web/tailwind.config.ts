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
        groth16: '#3b82f6',
        plonk: '#8b5cf6',
        stark: '#ec4899',
        arbitrum: {
          blue: '#28a0f0',
          dark: '#0a2540',
        },
      },
    },
  },
  plugins: [],
};

export default config;
