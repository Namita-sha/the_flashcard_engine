/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        pink: {
          50:  "#fff0f5",
          100: "#ffe0ec",
          200: "#ffb3cc",
          300: "#ff85ad",
          400: "#ff5c8f",
          500: "#e6396e",
        },
        dark: {
          900: "#0a0a0a",
          800: "#111111",
          700: "#1a1a1a",
          600: "#222222",
          500: "#2e2e2e",
          400: "#3a3a3a",
        }
      },
      fontFamily: {
        display: ["'DM Serif Display'", "serif"],
        body:    ["'DM Sans'", "sans-serif"],
      },
      animation: {
        "flip-in":  "flipIn 0.4s ease forwards",
        "flip-out": "flipOut 0.4s ease forwards",
        "fade-up":  "fadeUp 0.5s ease forwards",
      },
      keyframes: {
        flipIn:  { "0%": { transform: "rotateY(90deg)", opacity: "0" }, "100%": { transform: "rotateY(0deg)", opacity: "1" } },
        flipOut: { "0%": { transform: "rotateY(0deg)", opacity: "1" }, "100%": { transform: "rotateY(-90deg)", opacity: "0" } },
        fadeUp:  { "0%": { transform: "translateY(16px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
      }
    },
  },
  plugins: [],
}