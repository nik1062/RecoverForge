/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#e4fb51",
        "primary-hover": "#d4eb41",
        "background-dark": "#212310",
        "surface-dark": "#1a1c0d",
        "surface-lighter": "#2b2f14",
        "border-dark": "#34381b",
        "text-muted": "#c4cc8e",
        "text-secondary": "#94a3b8",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        heading: ["Syne", "sans-serif"],
      },
    },
  },
  plugins: [],
}
