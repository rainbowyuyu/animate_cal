/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "gemini-blue": "#4285F4",
        "gemini-purple": "#9B72FF",
        "gemini-bg-end": "#050110",
      },
      fontFamily: {
        sans: ["'Google Sans'", "'Inter'", "'Roboto'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "gemini-glow": "0 0 30px rgba(66, 133, 244, 0.2)",
        "gemini-glow-strong": "0 0 40px rgba(66, 133, 244, 0.35)",
      },
      backdropBlur: {
        xl: "24px",
      },
      animation: {
        "ease-google": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
