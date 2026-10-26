/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: {
            900: "#0A192F",
            800: "#102A43",
            700: "#1E3A8A",
            600: "#244E7A",
            50: "#F0F4F8"
          },
          teal: {
            600: "#0D9488",
            500: "#14B8A6",
            50: "#F0FDFA"
          },
          slate: {
            800: "#1E293B",
            700: "#334155",
            600: "#475569",
            100: "#F1F5F9",
            50: "#F8FAFC"
          }
        }
      }
    },
  },
  plugins: [],
}
