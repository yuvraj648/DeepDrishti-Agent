/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00D4FF",
        "background-dark": "#020617",
        "background-light": "#0f172a",
        "navy-surface": "#0b1220",
        "navy-border": "#1e293b",
      }
    },
  },
  plugins: [],
}