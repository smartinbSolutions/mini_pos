module.exports = {
  content: ["./src/frontend/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Action colours — one meaning each, used everywhere:
      // ok = confirm / save / money in, danger = delete / cancel,
      // brand = navigation / general actions, warn = attention.
      colors: {
        brand: {
          50: "#eef3ff",
          100: "#dfe7ff",
          600: "#3653e6",
          700: "#2a43c4",
          DEFAULT: "#4663ff",
        },
        ok: {
          50: "#ecfdf3",
          100: "#d1fadf",
          600: "#15803d",
          700: "#116932",
          DEFAULT: "#16a34a",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          600: "#dc2626",
          700: "#b91c1c",
          DEFAULT: "#dc2626",
        },
        warn: {
          50: "#fff7ed",
          100: "#ffedd5",
          600: "#ea580c",
          700: "#c2410c",
          DEFAULT: "#f97316",
        },
        ink: {
          DEFAULT: "#0f172a",
          soft: "#334155",
          muted: "#475569",
        },
      },
    },
  },
  plugins: [],
};
