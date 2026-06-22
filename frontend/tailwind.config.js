/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: "#05070c",
          900: "#090d16",
          850: "#0e1322",
          800: "#12192d",
          700: "#1c253d",
          600: "#2d395d",
          400: "#94a3b8"
        },
        brand: {
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        }
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-brand': '0 8px 32px 0 rgba(99, 102, 241, 0.15)',
      }
    },
  },
  plugins: [],
}
