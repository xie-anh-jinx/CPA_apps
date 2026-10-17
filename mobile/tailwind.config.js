/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "../shared/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          dark: "#0b0f19",
          light: "#f8fafc",
        },
        surface: {
          dark: "#111827",
          light: "#ffffff",
        },
        card: {
          dark: "#1e293b",
          light: "#ffffff",
        },
        border: {
          dark: "#334155",
          light: "#e2e8f0",
        },
        primary: {
          DEFAULT: "#0ea5e9",
          light: "#38bdf8",
          dark: "#0284c7",
        },
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
    },
  },
  plugins: [],
};
